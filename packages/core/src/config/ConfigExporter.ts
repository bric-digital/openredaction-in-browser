/**
 * Configuration export/import utilities
 * Share configurations between projects and version control
 */

import type { OpenRedactionOptions } from '../types';
import { ConfigCodec } from './ConfigCodec';
import type { ExportedConfig } from './ConfigCodec';

export type { ExportedConfig } from './ConfigCodec';

export class ConfigExporter {
  /**
   * Export configuration to JSON
   */
  static exportConfig(
    options: OpenRedactionOptions & {
      categories?: string[];
      maxInputSize?: number;
      regexTimeout?: number;
    },
    metadata?: {
      description?: string;
      author?: string;
      tags?: string[];
    }
  ) {
    return ConfigCodec.exportConfig(options, metadata);
  }

  /**
   * Import configuration from JSON
   */
  static importConfig(
    exported: ExportedConfig,
    _options?: {
      mergeWithDefaults?: boolean;
      validatePatterns?: boolean;
    }
  ) {
    return ConfigCodec.importConfig(exported, _options);
  }

  /**
   * Export configuration to JSON string
   */
  static exportToString(
    options: OpenRedactionOptions & {
      categories?: string[];
      maxInputSize?: number;
      regexTimeout?: number;
    },
    metadata?: {
      description?: string;
      author?: string;
      tags?: string[];
    },
    pretty?: boolean
  ): string {
    return ConfigCodec.exportToString(options, metadata, pretty);
  }

  /**
   * Import configuration from JSON string
   */
  static importFromString(json: string): OpenRedactionOptions & {
    categories?: string[];
    maxInputSize?: number;
    regexTimeout?: number;
  } {
    return ConfigCodec.importFromString(json);
  }

  /**
   * Export configuration to file (Node.js only)
   */
  static async exportToFile(
    filePath: string,
    options: OpenRedactionOptions & {
      categories?: string[];
      maxInputSize?: number;
      regexTimeout?: number;
    },
    metadata?: {
      description?: string;
      author?: string;
      tags?: string[];
    }
  ): Promise<void> {
    const fs = await import('fs/promises');
    const content = this.exportToString(options, metadata, true);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Import configuration from file (Node.js only)
   */
  static async importFromFile(filePath: string): Promise<OpenRedactionOptions & {
    categories?: string[];
    maxInputSize?: number;
    regexTimeout?: number;
  }> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return this.importFromString(content);
  }

  /**
   * Validate exported config structure
   */
  static validateConfig(exported: import('./ConfigCodec').ExportedConfig): {
    valid: boolean;
    errors: string[];
  } {
    return ConfigCodec.validateConfig(exported);
  }

  /**
   * Merge two configurations (useful for extending base configs)
   */
  static mergeConfigs(
    base: import('./ConfigCodec').ExportedConfig,
    override: import('./ConfigCodec').ExportedConfig
  ): import('./ConfigCodec').ExportedConfig {
    return ConfigCodec.mergeConfigs(base, override);
  }
}

/**
 * Convenience functions for common use cases
 */

/**
 * Create a shareable config preset
 */
export function createConfigPreset(
  name: string,
  description: string,
  options: OpenRedactionOptions & {
    categories?: string[];
    maxInputSize?: number;
    regexTimeout?: number;
  }
): string {
  return ConfigExporter.exportToString(options, {
    description: `${name}: ${description}`,
    tags: [name, 'preset']
  }, true);
}

/**
 * Quick export for version control
 */
export function exportForVersionControl(
  options: OpenRedactionOptions & {
    categories?: string[];
    maxInputSize?: number;
    regexTimeout?: number;
  }
): string {
  return ConfigExporter.exportToString(options, {
    description: 'OpenRedaction configuration',
    author: 'Generated automatically',
    tags: ['version-control']
  }, true);
}
