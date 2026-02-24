import { CoreDetector } from '../core/CoreDetector.js';
import type { DetectionResult, OpenRedactionOptions, PIIDetection, PIIPattern } from '../types.js';
import { createLearningDisabledError, createOptimizationDisabledError } from '../errors/OpenRedactionError.js';

export type BrowserOpenRedactionOptions = OpenRedactionOptions & {
  configPath?: string;
  enableLearning?: boolean;
  learningStorePath?: string;
  enablePriorityOptimization?: boolean;
  optimizerOptions?: unknown;
};

function createBrowserOnlyError(feature: string): Error {
  return new Error(
    `[OpenRedaction/browser] ${feature} is not available in browser builds. ` +
    'Use the Node.js entry for filesystem, learning store persistence, or worker-thread features.'
  );
}

export class OpenRedaction {
  private readonly core: CoreDetector;
  private readonly options: BrowserOpenRedactionOptions;

  constructor(options: BrowserOpenRedactionOptions = {}) {
    if (options.configPath) {
      throw createBrowserOnlyError('configPath');
    }

    if (options.enableLearning) {
      throw createBrowserOnlyError('enableLearning');
    }

    if (options.enablePriorityOptimization) {
      throw createBrowserOnlyError('enablePriorityOptimization');
    }

    this.options = {
      ...options,
      enableLearning: false,
      enablePriorityOptimization: false
    };

    const browserSafeOptions: OpenRedactionOptions = { ...this.options };
    delete (browserSafeOptions as Record<string, unknown>).configPath;
    delete (browserSafeOptions as Record<string, unknown>).learningStorePath;
    delete (browserSafeOptions as Record<string, unknown>).enableLearning;
    delete (browserSafeOptions as Record<string, unknown>).enablePriorityOptimization;
    delete (browserSafeOptions as Record<string, unknown>).optimizerOptions;

    this.core = new CoreDetector(browserSafeOptions);
  }

  static async fromConfig(_configPath?: string): Promise<OpenRedaction> {
    throw createBrowserOnlyError('OpenRedaction.fromConfig');
  }

  async detect(text: string): Promise<DetectionResult> {
    return this.core.detect(text);
  }

  restore(redactedText: string, redactionMap: Record<string, string>): string {
    return this.core.restore(redactedText, redactionMap);
  }

  async scan(text: string): Promise<{
    high: PIIDetection[];
    medium: PIIDetection[];
    low: PIIDetection[];
    total: number;
  }> {
    return this.core.scan(text);
  }

  getPatterns(): PIIPattern[] {
    return this.core.getPatterns();
  }

  addToWhitelist(pattern: string): void {
    const current = this.options.whitelist || [];
    this.options.whitelist = [...current, pattern];
    this.core.setWhitelist(this.options.whitelist);
  }

  removeFromWhitelist(pattern: string): void {
    const current = this.options.whitelist || [];
    this.options.whitelist = current.filter(w => w !== pattern);
    this.core.setWhitelist(this.options.whitelist);
  }

  getLearningStore(): undefined {
    return undefined;
  }

  getPriorityOptimizer(): undefined {
    return undefined;
  }

  recordFalsePositive(): void {
    throw createLearningDisabledError();
  }

  recordFalseNegative(): void {
    throw createLearningDisabledError();
  }

  recordCorrectDetection(): void {
    throw createLearningDisabledError();
  }

  getLearningStats(): null {
    return null;
  }

  getLearnedWhitelist(): [] {
    return [];
  }

  getPatternAdjustments(): [] {
    return [];
  }

  exportLearnings(): null {
    return null;
  }

  importLearnings(): void {
    throw createLearningDisabledError();
  }

  optimizePriorities(): void {
    throw createOptimizationDisabledError();
  }

  getPatternStats(): null {
    return null;
  }

  clearCache(): void {
    this.core.clearCache();
  }

  getCacheStats(): { size: number; maxSize: number; enabled: boolean } {
    return this.core.getCacheStats();
  }

  exportConfig(): string {
    throw createBrowserOnlyError('exportConfig');
  }

  async detectDocument(): Promise<never> {
    throw createBrowserOnlyError('detectDocument');
  }

  async detectDocumentFile(): Promise<never> {
    throw createBrowserOnlyError('detectDocumentFile');
  }

  static async detectBatch(): Promise<never> {
    throw createBrowserOnlyError('OpenRedaction.detectBatch');
  }

  static async detectDocumentsBatch(): Promise<never> {
    throw createBrowserOnlyError('OpenRedaction.detectDocumentsBatch');
  }
}
