/**
 * Configuration Service
 *
 * Provides configuration import/export functionality:
 * - Export all configuration (sources, hosts, settings, filter rules)
 * - Import configuration with validation
 * - JSON format support
 * - Comprehensive error handling
 */

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { filterService } from './filter.service';
import { ERROR_CODES, VALIDATION } from '../config/constants';

// ============================================================================
// Types
// ============================================================================

export interface SourceConfig {
  id?: string;
  name: string;
  url: string;
  type: 'URL' | 'FILE';
  enabled: boolean;
  format: 'standard' | 'adblock' | 'auto';
  metadata?: Record<string, any>;
}

export interface HostEntryConfig {
  domain: string;
  normalized: string;
  entryType: 'block' | 'allow' | 'element';
  sourceId?: string;
}

export interface FilterRuleConfig {
  id?: string;
  pattern: string;
  type: 'block' | 'allow' | 'wildcard' | 'regex';
  priority: number;
  enabled: boolean;
  sourceId?: string;
}

export interface ApplicationSettings {
  aggregationSchedule?: string;
  defaultOutputFormat?: 'standard' | 'adblock';
  autoAggregationEnabled?: boolean;
  rateLimitingEnabled?: boolean;
  loggingLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export interface ConfigurationExport {
  version: string;
  exportedAt: string;
  exportedBy?: string;
  sources: SourceConfig[];
  filterRules: FilterRuleConfig[];
  settings: ApplicationSettings;
  metadata: {
    totalSources: number;
    totalFilterRules: number;
    exportType: 'full' | 'partial';
  };
}

export interface ConfigurationImport {
  version?: string;
  sources?: SourceConfig[];
  filterRules?: FilterRuleConfig[];
  settings?: ApplicationSettings;
}

export interface ImportOptions {
  overwriteExisting?: boolean;
  skipInvalid?: boolean;
  dryRun?: boolean;
  importSources?: boolean;
  importFilterRules?: boolean;
  importSettings?: boolean;
}

export interface ImportResult {
  success: boolean;
  sources: {
    imported: number;
    updated: number;
    failed: number;
    skipped: number;
  };
  filterRules: {
    imported: number;
    failed: number;
    skipped: number;
  };
  settings: {
    imported: boolean;
    errors: string[];
  };
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Configuration Service
// ============================================================================

export class ConfigService {
  private readonly CURRENT_VERSION = '1.0.0';

  /**
   * Exports all configuration
   */
  async exportConfig(userId?: string): Promise<ConfigurationExport> {
    try {
      logger.info('Starting configuration export');

      // Fetch all sources
      const sources = await prisma.source.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Fetch all filter rules
      const filterRules = filterService.getAllRules();

      // Get application settings (from environment or database)
      const settings = await this.getSettings();

      const config: ConfigurationExport = {
        version: this.CURRENT_VERSION,
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url || '',
          type: s.type as 'URL' | 'FILE',
          enabled: s.enabled,
          format: (s.format as 'standard' | 'adblock' | 'auto') || 'auto',
          metadata: s.metadata ? JSON.parse(s.metadata) : undefined,
        })),
        filterRules: filterRules.map((r) => ({
          id: r.id,
          pattern: r.pattern,
          type: r.type,
          priority: r.priority,
          enabled: r.enabled,
          sourceId: r.sourceId,
        })),
        settings,
        metadata: {
          totalSources: sources.length,
          totalFilterRules: filterRules.length,
          exportType: 'full',
        },
      };

      logger.info(
        `Configuration exported: ${config.metadata.totalSources} sources, ${config.metadata.totalFilterRules} filter rules`
      );

      return config;
    } catch (error) {
      logger.error('Failed to export configuration:', error);
      throw this.createError('Failed to export configuration', ERROR_CODES.CONFIG_EXPORT_FAILED);
    }
  }

  /**
   * Imports configuration from JSON
   */
  async importConfig(
    config: ConfigurationImport,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const {
      overwriteExisting = false,
      skipInvalid = true,
      dryRun = false,
      importSources = true,
      importFilterRules = true,
      importSettings = true,
    } = options;

    const result: ImportResult = {
      success: true,
      sources: { imported: 0, updated: 0, failed: 0, skipped: 0 },
      filterRules: { imported: 0, failed: 0, skipped: 0 },
      settings: { imported: false, errors: [] },
      errors: [],
      warnings: [],
    };

    try {
      logger.info('Starting configuration import');

      // Validate configuration format
      const validation = this.validateConfigFormat(config);
      if (!validation.valid) {
        throw this.createError(
          `Invalid configuration format: ${validation.errors.join(', ')}`,
          ERROR_CODES.CONFIG_INVALID_FORMAT
        );
      }

      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      // Import sources
      if (importSources && config.sources) {
        const sourceResult = await this.importSources(config.sources, {
          overwriteExisting,
          skipInvalid,
          dryRun,
        });
        result.sources = sourceResult;
        result.errors.push(
          ...(sourceResult.failed > 0 ? [`${sourceResult.failed} sources failed to import`] : [])
        );
      }

      // Import filter rules
      if (importFilterRules && config.filterRules) {
        const ruleResult = await this.importFilterRules(config.filterRules, {
          skipInvalid,
          dryRun,
        });
        result.filterRules = ruleResult;
        result.errors.push(
          ...(ruleResult.failed > 0 ? [`${ruleResult.failed} filter rules failed to import`] : [])
        );
      }

      // Import settings
      if (importSettings && config.settings) {
        const settingsResult = await this.importSettings(config.settings, { dryRun });
        result.settings = settingsResult;
        result.errors.push(...settingsResult.errors);
      }

      result.success = result.errors.length === 0 || skipInvalid;

      logger.info(
        `Configuration import completed: ${result.sources.imported} sources imported, ${result.filterRules.imported} filter rules imported`
      );

      return result;
    } catch (error) {
      logger.error('Failed to import configuration:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Validates configuration format
   */
  validateConfigFormat(config: ConfigurationImport): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push('Configuration object is required');
      return { valid: false, errors, warnings };
    }

    // Check version compatibility
    if (config.version && config.version !== this.CURRENT_VERSION) {
      warnings.push(
        `Configuration version ${config.version} may not be fully compatible with current version ${this.CURRENT_VERSION}`
      );
    }

    // Validate sources
    if (config.sources) {
      if (!Array.isArray(config.sources)) {
        errors.push('Sources must be an array');
      } else {
        for (let i = 0; i < config.sources.length; i++) {
          const source = config.sources[i];
          if (!source.name) {
            errors.push(`Source at index ${i} is missing required field: name`);
          }
          if (!source.url) {
            errors.push(`Source at index ${i} is missing required field: url`);
          }
          if (source.name && source.name.length > VALIDATION.MAX_SOURCE_NAME_LENGTH) {
            errors.push(`Source "${source.name}" name exceeds maximum length`);
          }
        }
      }
    }

    // Validate filter rules
    if (config.filterRules) {
      if (!Array.isArray(config.filterRules)) {
        errors.push('Filter rules must be an array');
      } else {
        for (let i = 0; i < config.filterRules.length; i++) {
          const rule = config.filterRules[i];
          if (!rule.pattern) {
            errors.push(`Filter rule at index ${i} is missing required field: pattern`);
          }
          if (rule.type && !['block', 'allow', 'wildcard', 'regex'].includes(rule.type)) {
            errors.push(`Filter rule "${rule.pattern}" has invalid type: ${rule.type}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Exports configuration to JSON string
   */
  async exportToJson(userId?: string): Promise<string> {
    const config = await this.exportConfig(userId);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Imports configuration from JSON string
   */
  async importFromJson(jsonString: string, options: ImportOptions = {}): Promise<ImportResult> {
    try {
      const config = JSON.parse(jsonString) as ConfigurationImport;
      return this.importConfig(config, options);
    } catch (error) {
      logger.error('Failed to parse configuration JSON:', error);
      return {
        success: false,
        sources: { imported: 0, updated: 0, failed: 0, skipped: 0 },
        filterRules: { imported: 0, failed: 0, skipped: 0 },
        settings: { imported: false, errors: [] },
        errors: [
          `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async importSources(
    sources: SourceConfig[],
    options: { overwriteExisting: boolean; skipInvalid: boolean; dryRun: boolean }
  ): Promise<ImportResult['sources']> {
    const result = { imported: 0, updated: 0, failed: 0, skipped: 0 };

    for (const source of sources) {
      try {
        // Check if source already exists
        const existingSource = await prisma.source.findFirst({
          where: {
            OR: [{ id: source.id || '' }, { name: source.name }],
          },
        });

        if (existingSource && !options.overwriteExisting) {
          result.skipped++;
          continue;
        }

        if (options.dryRun) {
          result.imported++;
          continue;
        }

        const sourceData = {
          name: source.name,
          url: source.url,
          filePath: null,
          type: source.type || 'URL',
          enabled: source.enabled ?? true,
          format: source.format || 'auto',
          metadata: source.metadata ? JSON.stringify(source.metadata) : null,
        };

        if (existingSource) {
          // Update existing source
          await prisma.source.update({
            where: { id: existingSource.id },
            data: sourceData,
          });
          result.updated++;
        } else {
          // Create new source
          await prisma.source.create({
            data: sourceData,
          });
          result.imported++;
        }
      } catch (error) {
        logger.error(`Failed to import source "${source.name}":`, error);
        result.failed++;
        if (!options.skipInvalid) {
          throw error;
        }
      }
    }

    return result;
  }

  private async importFilterRules(
    rules: FilterRuleConfig[],
    options: { skipInvalid: boolean; dryRun: boolean }
  ): Promise<ImportResult['filterRules']> {
    const result = { imported: 0, failed: 0, skipped: 0 };

    for (const rule of rules) {
      try {
        if (options.dryRun) {
          // Validate pattern without adding
          const validation = filterService.validatePattern(rule.pattern, rule.type);
          if (!validation.valid) {
            throw new Error(`Invalid pattern: ${validation.issues.join(', ')}`);
          }
          result.imported++;
          continue;
        }

        filterService.addRule({
          pattern: rule.pattern,
          type: rule.type,
          priority: rule.priority ?? 100,
          enabled: rule.enabled ?? true,
          sourceId: rule.sourceId,
        });

        result.imported++;
      } catch (error) {
        logger.error(`Failed to import filter rule "${rule.pattern}":`, error);
        result.failed++;
        if (!options.skipInvalid) {
          throw error;
        }
      }
    }

    return result;
  }

  private async importSettings(
    settings: ApplicationSettings,
    options: { dryRun: boolean }
  ): Promise<ImportResult['settings']> {
    const result = { imported: false, errors: [] as string[] };

    try {
      if (options.dryRun) {
        result.imported = true;
        return result;
      }

      // Settings are stored in environment variables or database
      // For now, we just log them as they may require manual configuration
      logger.info('Importing application settings:', settings);

      // Store settings in database (would need a Settings model)
      // For now, just validate and log
      if (settings.aggregationSchedule) {
        // Validate cron expression
        const cronRegex = /^(\*|\d+)(\s+)(\*|\d+)(\s+)(\*|\d+)(\s+)(\*|\d+)(\s+)(\*|\d+)$/;
        if (!cronRegex.test(settings.aggregationSchedule)) {
          result.errors.push('Invalid aggregation schedule format');
        }
      }

      if (
        settings.loggingLevel &&
        !['error', 'warn', 'info', 'debug'].includes(settings.loggingLevel)
      ) {
        result.errors.push('Invalid logging level');
      }

      result.imported = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private async getSettings(): Promise<ApplicationSettings> {
    // Return current application settings
    // In a real implementation, these would be stored in a database
    return {
      aggregationSchedule: process.env.AGGREGATION_SCHEDULE || '0 */6 * * *',
      defaultOutputFormat:
        (process.env.DEFAULT_OUTPUT_FORMAT as 'standard' | 'adblock') || 'standard',
      autoAggregationEnabled: process.env.AUTO_AGGREGATION_ENABLED === 'true',
      rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED !== 'false',
      loggingLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    };
  }

  private createError(message: string, code: string): Error {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
  }
}

// Export singleton instance
export const configService = new ConfigService();
