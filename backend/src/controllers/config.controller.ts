/**
 * Configuration Controller
 *
 * Handles configuration import/export endpoints:
 * - Export configuration endpoint
 * - Import configuration endpoint
 * - Validation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { configService, ImportOptions } from '../services/config.service';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { SECURITY } from '../config/constants';

/**
 * Configuration Controller class
 */
export class ConfigController {
  /**
   * Export configuration
   * GET /api/config/export
   */
  async exportConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration export requested');

      // Get user ID from authenticated request if available
      const userId = (req as any).user?.id;

      // Export configuration
      const config = await configService.exportConfig(userId);

      // Set headers for JSON download
      const filename = `hosts-aggregator-config-${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.json({
        status: 'success',
        data: config,
        metadata: {
          exportedAt: config.exportedAt,
          totalSources: config.metadata.totalSources,
          totalFilterRules: config.metadata.totalFilterRules,
        },
      });
    } catch (error) {
      logger.error('Failed to export configuration:', error);
      next(error);
    }
  }

  /**
   * Export configuration as downloadable JSON file
   * GET /api/config/export/download
   */
  async exportConfigDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration download requested');

      const userId = (req as any).user?.id;
      const jsonString = await configService.exportToJson(userId);

      const filename = `hosts-aggregator-config-${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(jsonString);
    } catch (error) {
      logger.error('Failed to export configuration for download:', error);
      next(error);
    }
  }

  /**
   * Import configuration
   * POST /api/config/import
   */
  async importConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration import requested');

      const { config, options } = req.body;

      if (!config) {
        return next(createError('Configuration data is required', 400));
      }

      // Validate request body size
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize > SECURITY.MAX_REQUEST_BODY_SIZE) {
        return next(
          createError(
            `Request body too large: ${bodySize} bytes (max: ${SECURITY.MAX_REQUEST_BODY_SIZE})`,
            413
          )
        );
      }

      // Parse import options
      const importOptions: ImportOptions = {
        overwriteExisting: options?.overwriteExisting ?? false,
        skipInvalid: options?.skipInvalid ?? true,
        dryRun: options?.dryRun ?? false,
        importSources: options?.importSources ?? true,
        importFilterRules: options?.importFilterRules ?? true,
        importSettings: options?.importSettings ?? true,
      };

      // Perform import
      const result = await configService.importConfig(config, importOptions);

      // Determine response status based on result
      const statusCode = result.success ? 200 : 400;

      res.status(statusCode).json({
        status: result.success ? 'success' : 'error',
        message: result.success
          ? 'Configuration imported successfully'
          : 'Configuration import completed with errors',
        data: {
          sources: result.sources,
          filterRules: result.filterRules,
          settings: result.settings,
        },
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      logger.error('Failed to import configuration:', error);
      next(error);
    }
  }

  /**
   * Import configuration from uploaded JSON file
   * POST /api/config/import/upload
   */
  async importConfigUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration upload import requested');

      const { options } = req.body;

      // Check if file was uploaded
      if (!req.file && !req.body.config) {
        return next(createError('Configuration file or JSON data is required', 400));
      }

      let configJson: string;

      if (req.file) {
        // Validate file size
        if (req.file.size > SECURITY.MAX_FILE_UPLOAD_SIZE) {
          return next(
            createError(
              `File too large: ${req.file.size} bytes (max: ${SECURITY.MAX_FILE_UPLOAD_SIZE})`,
              413
            )
          );
        }

        // Validate file type
        if (req.file.mimetype !== 'application/json' && !req.file.originalname.endsWith('.json')) {
          return next(createError('Invalid file type. Only JSON files are allowed', 400));
        }

        configJson = req.file.buffer.toString('utf-8');
      } else {
        configJson = JSON.stringify(req.body.config);
      }

      // Parse import options
      const importOptions: ImportOptions = {
        overwriteExisting: options?.overwriteExisting ?? false,
        skipInvalid: options?.skipInvalid ?? true,
        dryRun: options?.dryRun ?? false,
        importSources: options?.importSources ?? true,
        importFilterRules: options?.importFilterRules ?? true,
        importSettings: options?.importSettings ?? true,
      };

      // Perform import
      const result = await configService.importFromJson(configJson, importOptions);

      // Determine response status
      const statusCode = result.success ? 200 : 400;

      res.status(statusCode).json({
        status: result.success ? 'success' : 'error',
        message: result.success
          ? 'Configuration imported successfully'
          : 'Configuration import completed with errors',
        data: {
          sources: result.sources,
          filterRules: result.filterRules,
          settings: result.settings,
        },
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      logger.error('Failed to import configuration from upload:', error);
      next(error);
    }
  }

  /**
   * Validate configuration without importing
   * POST /api/config/validate
   */
  async validateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration validation requested');

      const { config } = req.body;

      if (!config) {
        return next(createError('Configuration data is required', 400));
      }

      // Validate configuration format
      const validation = configService.validateConfigFormat(config);

      res.json({
        status: validation.valid ? 'success' : 'error',
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      });
    } catch (error) {
      logger.error('Failed to validate configuration:', error);
      next(error);
    }
  }

  /**
   * Preview configuration import (dry run)
   * POST /api/config/preview
   */
  async previewImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Configuration import preview requested');

      const { config, options } = req.body;

      if (!config) {
        return next(createError('Configuration data is required', 400));
      }

      // Perform dry run import
      const importOptions: ImportOptions = {
        overwriteExisting: options?.overwriteExisting ?? false,
        skipInvalid: true,
        dryRun: true,
        importSources: options?.importSources ?? true,
        importFilterRules: options?.importFilterRules ?? true,
        importSettings: options?.importSettings ?? true,
      };

      const result = await configService.importConfig(config, importOptions);

      res.json({
        status: 'success',
        message: 'Import preview completed',
        data: {
          sources: result.sources,
          filterRules: result.filterRules,
          settings: result.settings,
          wouldImport: {
            sources: result.sources.imported + result.sources.updated,
            filterRules: result.filterRules.imported,
            settings: result.settings.imported,
          },
        },
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      logger.error('Failed to preview configuration import:', error);
      next(error);
    }
  }

  /**
   * Get import/export status and statistics
   * GET /api/config/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This would typically check the status of ongoing import/export operations
      // For now, return basic information
      res.json({
        status: 'success',
        data: {
          lastExport: null,
          lastImport: null,
          operations: [],
        },
      });
    } catch (error) {
      logger.error('Failed to get configuration status:', error);
      next(error);
    }
  }

  /**
   * Export partial configuration (selected sources only)
   * POST /api/config/export/partial
   */
  async exportPartialConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Partial configuration export requested');

      const { sourceIds, includeFilterRules = true, includeSettings = false } = req.body;

      if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
        return next(createError('sourceIds array is required', 400));
      }

      // Get full export
      const userId = (req as any).user?.id;
      const fullConfig = await configService.exportConfig(userId);

      // Filter to only requested sources
      const filteredSources = fullConfig.sources.filter((s) => sourceIds.includes(s.id));

      const partialConfig = {
        ...fullConfig,
        sources: filteredSources,
        filterRules: includeFilterRules ? fullConfig.filterRules : [],
        settings: includeSettings ? fullConfig.settings : {},
        metadata: {
          ...fullConfig.metadata,
          totalSources: filteredSources.length,
          totalFilterRules: includeFilterRules ? fullConfig.metadata.totalFilterRules : 0,
          exportType: 'partial' as const,
        },
      };

      res.json({
        status: 'success',
        data: partialConfig,
        metadata: {
          exportedAt: partialConfig.exportedAt,
          totalSources: partialConfig.metadata.totalSources,
          totalFilterRules: partialConfig.metadata.totalFilterRules,
          exportType: 'partial',
        },
      });
    } catch (error) {
      logger.error('Failed to export partial configuration:', error);
      next(error);
    }
  }

  /**
   * Reset configuration to defaults
   * POST /api/config/reset
   * (Admin only - removes all custom configuration)
   */
  async resetConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.warn('Configuration reset requested');

      const { confirm } = req.body;

      if (confirm !== true) {
        return next(
          createError('Confirmation required. Set confirm: true to reset configuration', 400)
        );
      }

      // This is a dangerous operation - would require admin privileges
      // Implementation depends on your security requirements
      logger.warn('Configuration reset is not implemented - requires admin privileges');

      return next(createError('Configuration reset requires admin privileges', 403));
    } catch (error) {
      logger.error('Failed to reset configuration:', error);
      next(error);
    }
  }
}

// Export controller instance
export const configController = new ConfigController();
