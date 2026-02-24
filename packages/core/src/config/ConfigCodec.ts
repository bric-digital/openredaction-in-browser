import type { OpenRedactionOptions, PIIPattern } from '../types';

export interface ExportedConfig {
  version: string;
  timestamp: string;
  options: {
    includeNames?: boolean;
    includeAddresses?: boolean;
    includePhones?: boolean;
    includeEmails?: boolean;
    patterns?: string[];
    categories?: string[];
    whitelist?: string[];
    deterministic?: boolean;
    redactionMode?: OpenRedactionOptions['redactionMode'];
    preset?: OpenRedactionOptions['preset'];
    enableContextAnalysis?: boolean;
    confidenceThreshold?: number;
    enableFalsePositiveFilter?: boolean;
    falsePositiveThreshold?: number;
    enableMultiPass?: boolean;
    multiPassCount?: number;
    enableCache?: boolean;
    cacheSize?: number;
    maxInputSize?: number;
    regexTimeout?: number;
  };
  customPatterns?: Array<{
    type: string;
    regex: string;
    flags: string;
    priority: number;
    placeholder: string;
    description?: string;
    severity?: string;
  }>;
  metadata?: {
    description?: string;
    author?: string;
    tags?: string[];
  };
}

type ConfigExportOptions = OpenRedactionOptions & {
  categories?: string[];
  maxInputSize?: number;
  regexTimeout?: number;
};

type ConfigMetadata = {
  description?: string;
  author?: string;
  tags?: string[];
};

export class ConfigCodec {
  static readonly CONFIG_VERSION = '1.0';

  static exportConfig(options: ConfigExportOptions, metadata?: ConfigMetadata): ExportedConfig {
    const exported: ExportedConfig = {
      version: this.CONFIG_VERSION,
      timestamp: new Date().toISOString(),
      options: {
        includeNames: options.includeNames,
        includeAddresses: options.includeAddresses,
        includePhones: options.includePhones,
        includeEmails: options.includeEmails,
        patterns: options.patterns,
        categories: options.categories,
        whitelist: options.whitelist,
        deterministic: options.deterministic,
        redactionMode: options.redactionMode,
        preset: options.preset,
        enableContextAnalysis: options.enableContextAnalysis,
        confidenceThreshold: options.confidenceThreshold,
        enableFalsePositiveFilter: options.enableFalsePositiveFilter,
        falsePositiveThreshold: options.falsePositiveThreshold,
        enableMultiPass: options.enableMultiPass,
        multiPassCount: options.multiPassCount,
        enableCache: options.enableCache,
        cacheSize: options.cacheSize,
        maxInputSize: options.maxInputSize,
        regexTimeout: options.regexTimeout
      },
      metadata
    };

    if (options.customPatterns && options.customPatterns.length > 0) {
      exported.customPatterns = options.customPatterns.map(p => ({
        type: p.type,
        regex: p.regex.source,
        flags: p.regex.flags,
        priority: p.priority,
        placeholder: p.placeholder,
        description: p.description,
        severity: p.severity
      }));
    }

    return JSON.parse(JSON.stringify(exported));
  }

  static importConfig(
    exported: ExportedConfig,
    _options?: {
      mergeWithDefaults?: boolean;
      validatePatterns?: boolean;
    }
  ): ConfigExportOptions {
    if (!exported.version || exported.version !== this.CONFIG_VERSION) {
      console.warn(
        `[OpenRedaction] Config version mismatch. Expected ${this.CONFIG_VERSION}, got ${exported.version}`
      );
    }

    const config: ConfigExportOptions = { ...exported.options };

    if (exported.customPatterns) {
      config.customPatterns = exported.customPatterns.map(p => {
        const pattern: PIIPattern = {
          type: p.type,
          regex: new RegExp(p.regex, p.flags),
          priority: p.priority,
          placeholder: p.placeholder,
          description: p.description,
          severity: p.severity as any
        };
        return pattern;
      });
    }

    return config;
  }

  static exportToString(options: ConfigExportOptions, metadata?: ConfigMetadata, pretty?: boolean): string {
    const exported = this.exportConfig(options, metadata);
    return JSON.stringify(exported, null, pretty ? 2 : undefined);
  }

  static importFromString(json: string): ConfigExportOptions {
    const exported: ExportedConfig = JSON.parse(json);
    return this.importConfig(exported);
  }

  static validateConfig(exported: ExportedConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!exported.version) {
      errors.push('Missing version field');
    }

    if (!exported.timestamp) {
      errors.push('Missing timestamp field');
    }

    if (!exported.options) {
      errors.push('Missing options field');
    }

    if (exported.customPatterns) {
      for (const pattern of exported.customPatterns) {
        if (!pattern.type || !pattern.regex || !pattern.placeholder) {
          errors.push(`Invalid custom pattern: ${pattern.type}`);
        }
        try {
          new RegExp(pattern.regex, pattern.flags);
        } catch (e) {
          errors.push(`Invalid regex in pattern ${pattern.type}: ${(e as Error).message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static mergeConfigs(base: ExportedConfig, override: ExportedConfig): ExportedConfig {
    return {
      version: this.CONFIG_VERSION,
      timestamp: new Date().toISOString(),
      options: {
        ...base.options,
        ...override.options,
        patterns: override.options.patterns || base.options.patterns,
        categories: override.options.categories || base.options.categories,
        whitelist: [
          ...(base.options.whitelist || []),
          ...(override.options.whitelist || [])
        ]
      },
      customPatterns: [
        ...(base.customPatterns || []),
        ...(override.customPatterns || [])
      ],
      metadata: {
        ...base.metadata,
        ...override.metadata
      }
    };
  }
}
