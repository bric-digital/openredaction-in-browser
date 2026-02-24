import {
  PIIPattern,
  PIIDetection,
  DetectionResult,
  OpenRedactionOptions,
  PresetName
} from '../types.js';
import { allPatterns, getPatternsByCategory } from '../patterns/index.js';
import { getPreset } from '../utils/presets.js';
import { applyRedactionMode } from '../utils/redaction-strategies.js';
import { analyzeFullContext } from '../context/ContextAnalyzer.js';
import { isFalsePositive } from '../filters/FalsePositiveFilter.js';
import { createSimpleMultiPass, groupPatternsByPass, mergePassDetections, type DetectionPass } from '../multipass/MultiPassDetector.js';
import { ContextRulesEngine, type ContextRulesConfig } from '../context/ContextRules.js';
import type { PIIMatch, RedactionMode } from '../types.js';
import { LRUCache, hashString } from '../utils/cache.js';
import { SeverityClassifier } from '../severity/SeverityClassifier.js';
import { safeExec, validatePattern, RegexTimeoutError } from '../utils/safe-regex.js';
import { generateDeterministicId } from '../utils/hash.js';
import { getAIEndpoint, callAIDetect, mergeAIEntities } from '../utils/ai-assist.js';

export type CoreDetectorOptions = OpenRedactionOptions & {
  preset?: PresetName;
  enableNER?: boolean;
  enableContextRules?: boolean;
  contextRulesConfig?: ContextRulesConfig;
  maxInputSize?: number;
  regexTimeout?: number;
};

type CoreDetectorInternalOptions = {
  includeNames: boolean;
  includeAddresses: boolean;
  includePhones: boolean;
  includeEmails: boolean;
  patterns: string[];
  categories: string[];
  customPatterns: PIIPattern[];
  whitelist: string[];
  deterministic: boolean;
  redactionMode: RedactionMode;
  preset?: PresetName;
  enableContextAnalysis: boolean;
  confidenceThreshold: number;
  enableFalsePositiveFilter: boolean;
  falsePositiveThreshold: number;
  enableMultiPass: boolean;
  multiPassCount: number;
  enableCache: boolean;
  cacheSize: number;
  debug: boolean;
  maxInputSize: number;
  regexTimeout: number;
  ai?: { enabled?: boolean; endpoint?: string };
};

interface NERDetectorLike {
  isAvailable(): boolean;
  hybridDetection(regexMatches: PIIMatch[], text: string): Array<PIIMatch & { confidence: number }>;
}

export class CoreDetector {
  private patterns: PIIPattern[];
  private compiledPatterns: Map<PIIPattern, RegExp> = new Map();
  private options: CoreDetectorInternalOptions;
  private multiPassConfig?: DetectionPass[];
  private resultCache?: LRUCache<string, DetectionResult>;
  private valueToPlaceholder: Map<string, string> = new Map();
  private placeholderCounter: Map<string, number> = new Map();
  private nerDetector?: NERDetectorLike;
  private readonly nerInitPromise: Promise<void>;
  private contextRulesEngine?: ContextRulesEngine;
  private severityClassifier: SeverityClassifier;

  constructor(options: CoreDetectorOptions = {}) {
    const presetOptions = options.preset ? getPreset(options.preset) : {};

    this.options = {
      includeNames: true,
      includeAddresses: true,
      includePhones: true,
      includeEmails: true,
      patterns: [],
      categories: [],
      customPatterns: [],
      whitelist: [],
      deterministic: true,
      redactionMode: 'placeholder',
      enableContextAnalysis: true,
      confidenceThreshold: 0.5,
      enableFalsePositiveFilter: false,
      falsePositiveThreshold: 0.7,
      enableMultiPass: false,
      multiPassCount: 3,
      enableCache: false,
      cacheSize: 100,
      debug: false,
      maxInputSize: 10 * 1024 * 1024,
      regexTimeout: 100,
      ...presetOptions,
      ...options
    };

    if (this.options.enableCache) {
      this.resultCache = new LRUCache<string, DetectionResult>(this.options.cacheSize);
    }

    if (this.options.enableMultiPass) {
      this.multiPassConfig = createSimpleMultiPass({
        numPasses: this.options.multiPassCount,
        prioritizeCredentials: true
      });
    }

    this.patterns = this.buildPatternList();
    this.validatePatterns();

    this.severityClassifier = new SeverityClassifier();
    this.patterns = this.severityClassifier.ensureAllSeverity(this.patterns);
    this.patterns.sort((a, b) => b.priority - a.priority);
    this.precompilePatterns();

    this.nerInitPromise = options.enableNER
      ? this.initializeNER()
      : Promise.resolve();

    if (options.enableContextRules !== false) {
      this.contextRulesEngine = new ContextRulesEngine(options.contextRulesConfig);
    }
  }

  private async initializeNER(): Promise<void> {
    try {
      const modulePath = ['..', 'ml', 'NERDetector.js'].join('/');
      const mod = await import(/* @vite-ignore */ modulePath);
      const detector = new mod.NERDetector() as NERDetectorLike;
      if (detector.isAvailable()) {
        this.nerDetector = detector;
      } else if (this.options.debug) {
        console.warn('[OpenRedaction] NER enabled but compromise.js not installed. Falling back to regex-only detection.');
      }
    } catch {
      if (this.options.debug) {
        console.warn('[OpenRedaction] NER module unavailable. Falling back to regex-only detection.');
      }
    }
  }

  private buildPatternList(): PIIPattern[] {
    let patterns: PIIPattern[];

    if (this.options.patterns.length > 0) {
      patterns = allPatterns.filter(p => this.options.patterns.includes(p.type));
    } else if (this.options.categories.length > 0) {
      patterns = [];
      for (const category of this.options.categories) {
        patterns.push(...getPatternsByCategory(category));
      }
      patterns = Array.from(new Map(patterns.map(p => [p.type, p])).values());

      if (this.options.debug) {
        console.log(`[OpenRedaction] Loaded ${patterns.length} patterns from categories: ${this.options.categories.join(', ')}`);
      }
    } else {
      patterns = allPatterns.filter(pattern => {
        if (pattern.type === 'NAME' && !this.options.includeNames) return false;
        if (pattern.type.startsWith('EMAIL') && !this.options.includeEmails) return false;
        if (pattern.type.startsWith('PHONE') && !this.options.includePhones) return false;
        if (pattern.type.startsWith('ADDRESS') && !this.options.includeAddresses) return false;
        if (pattern.type.startsWith('POSTCODE') && !this.options.includeAddresses) return false;
        if (pattern.type.startsWith('ZIP') && !this.options.includeAddresses) return false;
        return true;
      });
    }

    if (this.options.customPatterns.length > 0) {
      patterns.push(...this.options.customPatterns);
    }

    return patterns;
  }

  private validatePatterns(): void {
    if (this.options.customPatterns.length === 0) {
      return;
    }

    for (const customPattern of this.options.customPatterns) {
      try {
        validatePattern(customPattern.regex);
      } catch (error) {
        throw new Error(`[OpenRedaction] Invalid custom pattern '${customPattern.type}': ${(error as Error).message}`);
      }
    }
  }

  private precompilePatterns(): void {
    this.compiledPatterns.clear();
    for (const pattern of this.patterns) {
      this.compiledPatterns.set(pattern, new RegExp(pattern.regex.source, pattern.regex.flags));
    }
  }

  private processPatterns(
    text: string,
    patterns: PIIPattern[],
    processedRanges: Array<[number, number]>
  ): PIIDetection[] {
    let detections: PIIDetection[] = [];

    for (const pattern of patterns) {
      const regex = this.compiledPatterns.get(pattern);
      if (!regex) continue;

      let match: RegExpExecArray | null;
      let matchCount = 0;
      const maxMatches = 10000;

      regex.lastIndex = 0;

      try {
        while ((match = safeExec(regex, text, { timeout: this.options.regexTimeout })) !== null) {
          matchCount++;
          if (matchCount >= maxMatches) break;

          const value = match[1] !== undefined ? match[1] : match[0];
          const fullMatch = match[0];

          let startPos: number;
          let endPos: number;

          if (match[1] !== undefined) {
            const captureIndex = fullMatch.indexOf(value);
            startPos = match.index + captureIndex;
            endPos = startPos + value.length;
          } else {
            startPos = match.index;
            endPos = startPos + value.length;
          }

          if (this.overlapsWithExisting(startPos, endPos, processedRanges)) {
            continue;
          }

          const contextStart = Math.max(0, startPos - 50);
          const contextEnd = Math.min(text.length, endPos + 50);
          const context = text.substring(contextStart, contextEnd);

          if (pattern.validator && !pattern.validator(value, context)) {
            continue;
          }

          if (this.options.enableFalsePositiveFilter) {
            const fpResult = isFalsePositive(value, pattern.type, context);
            if (fpResult.isFalsePositive && fpResult.confidence >= this.options.falsePositiveThreshold) {
              continue;
            }
          }

          let confidence = 1.0;
          if (this.options.enableContextAnalysis) {
            const contextAnalysis = analyzeFullContext(text, value, pattern.type, startPos, endPos);
            confidence = contextAnalysis.confidence;
          }

          if (this.contextRulesEngine) {
            const piiMatch: PIIMatch = {
              type: pattern.type,
              value,
              start: startPos,
              end: endPos,
              confidence,
              context: {
                before: text.substring(Math.max(0, startPos - 250), startPos),
                after: text.substring(endPos, Math.min(text.length, endPos + 250))
              }
            };

            const adjusted = this.contextRulesEngine.applyProximityRules(piiMatch, text);
            confidence = adjusted.confidence;
          }

          if (confidence < this.options.confidenceThreshold) {
            continue;
          }

          if (this.options.whitelist.some(term => value.toLowerCase().includes(term.toLowerCase()))) {
            continue;
          }

          const placeholder = this.generatePlaceholder(value, pattern);

          detections.push({
            type: pattern.type,
            value,
            placeholder,
            position: [startPos, endPos],
            severity: pattern.severity || 'medium',
            confidence
          });

          processedRanges.push([startPos, endPos]);
        }
      } catch (error) {
        if (error instanceof RegexTimeoutError) {
          continue;
        }
        throw error;
      }
    }

    if (this.nerDetector && detections.length > 0) {
      const piiMatches: PIIMatch[] = detections.map(det => ({
        type: det.type,
        value: det.value,
        start: det.position[0],
        end: det.position[1],
        confidence: det.confidence || 1.0,
        context: {
          before: text.substring(Math.max(0, det.position[0] - 50), det.position[0]),
          after: text.substring(det.position[1], Math.min(text.length, det.position[1] + 50))
        }
      }));

      const hybridMatches = this.nerDetector.hybridDetection(piiMatches, text);
      detections = detections.map((det, index) => ({
        ...det,
        confidence: hybridMatches[index].confidence
      }));
    }

    if (this.contextRulesEngine && detections.length > 0) {
      const piiMatches: PIIMatch[] = detections.map(det => ({
        type: det.type,
        value: det.value,
        start: det.position[0],
        end: det.position[1],
        confidence: det.confidence || 1.0,
        context: {
          before: text.substring(Math.max(0, det.position[0] - 50), det.position[0]),
          after: text.substring(det.position[1], Math.min(text.length, det.position[1] + 50))
        }
      }));

      const boostedMatches = this.contextRulesEngine.applyDomainBoosting(piiMatches, text);
      detections = detections.map((det, index) => ({
        ...det,
        confidence: boostedMatches[index].confidence
      }));
    }

    return detections;
  }

  async detect(text: string): Promise<DetectionResult> {
    await this.nerInitPromise;

    const startTime = performance.now();

    const textSize = new Blob([text]).size;
    if (textSize > this.options.maxInputSize) {
      throw new Error(
        `[OpenRedaction] Input size (${textSize} bytes) exceeds maximum allowed size (${this.options.maxInputSize} bytes). ` +
        `Set maxInputSize option to increase limit or use streaming/batch processing for large documents.`
      );
    }

    if (this.resultCache) {
      const cacheKey = hashString(text);
      const cached = this.resultCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (!this.options.deterministic) {
      this.placeholderCounter.clear();
      this.valueToPlaceholder.clear();
    }

    let detections: PIIDetection[];
    const processedRanges: Array<[number, number]> = [];

    if (this.options.enableMultiPass && this.multiPassConfig) {
      const patternGroups = groupPatternsByPass(this.patterns, this.multiPassConfig);
      const passDetections = new Map<string, PIIDetection[]>();

      for (const pass of this.multiPassConfig) {
        const passPatterns = patternGroups.get(pass.name) || [];
        if (passPatterns.length === 0) continue;
        const currentDetections = this.processPatterns(text, passPatterns, processedRanges);
        passDetections.set(pass.name, currentDetections);
        for (const detection of currentDetections) {
          processedRanges.push(detection.position);
        }
      }

      detections = mergePassDetections(passDetections, this.multiPassConfig);
    } else {
      detections = this.processPatterns(text, this.patterns, processedRanges);
    }

    if (this.options.ai?.enabled) {
      const aiEndpoint = getAIEndpoint(this.options.ai);
      if (aiEndpoint) {
        try {
          const aiEntities = await callAIDetect(text, aiEndpoint, this.options.debug);
          if (aiEntities && aiEntities.length > 0) {
            detections = mergeAIEntities(detections, aiEntities, text);
          }
        } catch {
          // Always fail open to regex-only detection.
        }
      }
    }

    detections.sort((a, b) => b.position[0] - a.position[0]);

    let redacted = text;
    const redactionMap: Record<string, string> = {};

    for (const detection of detections) {
      if (!detection.value) continue;
      const escapedValue = this.escapeRegex(detection.value);
      redacted = redacted.replace(new RegExp(escapedValue, 'gi'), detection.placeholder);
      redactionMap[detection.placeholder] = detection.value;
    }

    const endTime = performance.now();
    const processingTime = Math.round((endTime - startTime) * 100) / 100;

    const result: DetectionResult = {
      original: text,
      redacted,
      detections: detections.reverse(),
      redactionMap,
      stats: {
        processingTime,
        piiCount: detections.length
      }
    };

    if (this.resultCache) {
      const cacheKey = hashString(text);
      this.resultCache.set(cacheKey, result);
    }

    return result;
  }

  restore(redactedText: string, redactionMap: Record<string, string>): string {
    let restored = redactedText;
    for (const [placeholder, value] of Object.entries(redactionMap)) {
      restored = restored.replace(new RegExp(this.escapeRegex(placeholder), 'g'), value);
    }
    return restored;
  }

  async scan(text: string): Promise<{
    high: PIIDetection[];
    medium: PIIDetection[];
    low: PIIDetection[];
    total: number;
  }> {
    const result = await this.detect(text);
    return {
      high: result.detections.filter(d => d.severity === 'high'),
      medium: result.detections.filter(d => d.severity === 'medium'),
      low: result.detections.filter(d => d.severity === 'low'),
      total: result.detections.length
    };
  }

  getPatterns(): PIIPattern[] {
    return [...this.patterns];
  }

  setPatterns(patterns: PIIPattern[]): void {
    this.patterns = this.severityClassifier.ensureAllSeverity([...patterns]);
    this.patterns.sort((a, b) => b.priority - a.priority);
    this.precompilePatterns();
    if (this.resultCache) {
      this.resultCache.clear();
    }
  }

  setWhitelist(whitelist: string[]): void {
    this.options.whitelist = [...whitelist];
  }

  clearCache(): void {
    if (this.resultCache) {
      this.resultCache.clear();
    }
  }

  getCacheStats(): { size: number; maxSize: number; enabled: boolean } {
    return {
      size: this.resultCache?.size || 0,
      maxSize: this.options.cacheSize,
      enabled: this.options.enableCache
    };
  }

  private generatePlaceholder(value: string, pattern: PIIPattern): string {
    if (this.options.deterministic && this.valueToPlaceholder.has(value)) {
      return this.valueToPlaceholder.get(value)!;
    }

    let placeholder: string;

    if (this.options.redactionMode !== 'placeholder') {
      placeholder = applyRedactionMode(value, pattern.type, this.options.redactionMode, pattern.placeholder);
      this.valueToPlaceholder.set(value, placeholder);
      return placeholder;
    }

    if (this.options.deterministic) {
      const id = generateDeterministicId(value, pattern.type);
      placeholder = pattern.placeholder.replace('{n}', id);
    } else {
      const count = (this.placeholderCounter.get(pattern.type) || 0) + 1;
      this.placeholderCounter.set(pattern.type, count);
      placeholder = pattern.placeholder.replace('{n}', count.toString());
    }

    this.valueToPlaceholder.set(value, placeholder);
    return placeholder;
  }

  private overlapsWithExisting(
    start: number,
    end: number,
    ranges: Array<[number, number]>
  ): boolean {
    return ranges.some(
      ([existingStart, existingEnd]) =>
        (start >= existingStart && start < existingEnd) ||
        (end > existingStart && end <= existingEnd) ||
        (start <= existingStart && end >= existingEnd)
    );
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
