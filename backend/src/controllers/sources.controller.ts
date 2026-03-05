import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AutoAggregationService } from '../services/auto-aggregation.service';
import { aggregationService } from '../services/aggregation.service';
import { HostsParser } from '../services/parser.service';

export class SourcesController {
  private autoAggregationService: AutoAggregationService;
  private parser: HostsParser;

  constructor() {
    this.autoAggregationService = new AutoAggregationService();
    this.parser = new HostsParser();
  }

  async getAllSources(req: Request, res: Response, next: NextFunction) {
    try {
      const sources = await prisma.source.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              hosts: true,
            },
          },
          contentCache: {
            select: {
              fetchedAt: true,
              entryCount: true,
            },
          },
          fetchLogs: {
            orderBy: { fetchedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              fetchedAt: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: sources.map((source) => ({
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null,
          hostCount: source._count.hosts,
          lastFetched: source.contentCache?.fetchedAt || null,
          lastFetchStatus: source.fetchLogs[0]?.status || null,
          entryCount: source.contentCache?.entryCount || 0,
          _count: undefined,
          contentCache: undefined,
          fetchLogs: undefined,
        })),
      });
    } catch (error) {
      logger.error('Failed to get sources:', error);
      next(error);
    }
  }

  async getSourceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const source = await prisma.source.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              hosts: true,
            },
          },
          contentCache: {
            select: {
              fetchedAt: true,
              entryCount: true,
              lineCount: true,
              contentHash: true,
            },
          },
          fetchLogs: {
            orderBy: { fetchedAt: 'desc' },
            take: 5,
            select: {
              status: true,
              httpStatus: true,
              errorMessage: true,
              responseTimeMs: true,
              contentChanged: true,
              fetchedAt: true,
            },
          },
          hosts: {
            select: {
              domain: true,
              entryType: true,
            },
            take: 100,
          },
        },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      res.json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null,
          hostCount: source._count.hosts,
          lastFetched: source.contentCache?.fetchedAt || null,
          lastFetchStatus: source.fetchLogs[0]?.status || null,
          entryCount: source.contentCache?.entryCount || 0,
          _count: undefined,
        },
      });
    } catch (error) {
      logger.error(`Failed to get source ${req.params.id}:`, error);
      next(error);
    }
  }

  async createSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, url, enabled = true, metadata, format } = req.body;

      // Check if source with same name already exists
      const existingSource = await prisma.source.findUnique({
        where: { name },
      });

      if (existingSource) {
        return next(createError('Source with this name already exists', 409));
      }

      const source = await prisma.source.create({
        data: {
          name,
          url,
          filePath: null,
          type: 'URL',
          enabled,
          format: format || 'auto',
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Track aggregation result to return to frontend
      let aggregationResult: {
        success: boolean;
        error?: string;
        entriesProcessed?: number;
      } | null = {
        success: true,
      };

      // Trigger incremental update if source is enabled (much faster than full aggregation)
      if (enabled) {
        // Start progress tracking
        aggregationService.updateProgress({
          totalSources: 1,
          currentSourceId: source.id,
          status: 'running',
          processedSources: 0,
          entriesProcessed: 0,
        });

        try {
          // First, fetch and cache the source content
          const processResult = await aggregationService.processSource(source);
          if (!processResult.success) {
            throw new Error(processResult.error || 'Failed to process source content');
          }
          // Then update aggregation tables incrementally
          const addResult = await aggregationService.incrementalAddSource(source.id);
          aggregationResult = {
            success: addResult.success,
            entriesProcessed: addResult.entriesProcessed,
            ...(addResult.error && { error: addResult.error }),
          };
          // Mark completed
          aggregationService.updateProgress({
            status: 'completed',
            processedSources: 1,
            currentSourceId: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Incremental add failed after source creation:', error);
          // Mark error
          aggregationService.updateProgress({
            status: 'error',
            currentSourceId: null,
          });
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(() => {});
          aggregationResult = {
            success: false,
            error: `Incremental update failed: ${errorMessage}. Background aggregation scheduled.`,
          };
        }
      } else {
        // If source is not enabled, we should clear any running progress
        aggregationService.updateProgress({
          status: 'idle',
          currentSourceId: null,
        });
      }

      res.status(201).json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null,
        },
        aggregation: aggregationResult,
      });
    } catch (error) {
      logger.error('Failed to create source:', error);
      next(error);
    }
  }

  async updateSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, url, enabled, metadata, format } = req.body;

      const existingSource = await prisma.source.findUnique({
        where: { id },
      });

      if (!existingSource) {
        return next(createError('Source not found', 404));
      }

      // Check if new name conflicts with another source
      if (name && name !== existingSource.name) {
        const nameConflict = await prisma.source.findUnique({
          where: { name },
        });

        if (nameConflict) {
          return next(createError('Source with this name already exists', 409));
        }
      }

      // Clear content cache if URL is being updated
      const urlChanged = url !== undefined && url !== existingSource.url;
      if (urlChanged) {
        await prisma.sourceContent.deleteMany({
          where: { sourceId: id },
        });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
      if (format !== undefined) updateData.format = format;

      const source = await prisma.source.update({
        where: { id },
        data: updateData,
      });

      // Trigger immediate aggregation if source is enabled or was enabled before update
      const shouldTriggerAggregation =
        (enabled !== undefined && enabled) ||
        (enabled === undefined && existingSource.enabled) ||
        urlChanged;

      if (shouldTriggerAggregation) {
        // Start progress tracking
        aggregationService.updateProgress({
          totalSources: 1,
          currentSourceId: source.id,
          status: 'running',
          processedSources: 0,
          entriesProcessed: 0,
        });

        try {
          // If URL changed and source was enabled, remove old contributions first
          if (urlChanged && existingSource.enabled) {
            await aggregationService.incrementalDeleteSource(source.id);
          }
          // Process the updated source content (fetch if URL changed, or use existing cache)
          const processResult = await aggregationService.processSource(source);
          if (!processResult.success) {
            throw new Error(processResult.error || 'Failed to process source content');
          }
          // Add updated source to aggregation
          const addResult = await aggregationService.incrementalAddSource(source.id);
          logger.info(
            `Incremental update completed for source ${source.id}: ${addResult.entriesProcessed} entries`
          );
          // Mark completed
          aggregationService.updateProgress({
            status: 'completed',
            processedSources: 1,
            currentSourceId: null,
          });
        } catch (error) {
          logger.error('Incremental update failed after source update:', error);
          // Mark error
          aggregationService.updateProgress({
            status: 'error',
            currentSourceId: null,
          });
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(() => {});
        }
      }

      res.json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null,
        },
      });
    } catch (error) {
      logger.error(`Failed to update source ${req.params.id}:`, error);
      next(error);
    }
  }

  async deleteSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const source = await prisma.source.findUnique({
        where: { id },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Cascade delete will handle related records (contentCache, hosts, fetchLogs)
      await prisma.source.delete({
        where: { id },
      });

      // Trigger incremental removal if source was enabled
      if (source.enabled) {
        // Start progress tracking
        aggregationService.updateProgress({
          totalSources: 1,
          currentSourceId: id,
          status: 'running',
          processedSources: 0,
          entriesProcessed: 0,
        });

        try {
          const result = await aggregationService.incrementalDeleteSource(id);
          logger.info(
            `Incremental delete completed for source ${id}: ${result.entriesRemoved} domains removed`
          );
          // Mark completed
          aggregationService.updateProgress({
            status: 'completed',
            processedSources: 1,
            currentSourceId: null,
          });
        } catch (error) {
          logger.error('Incremental delete failed after source deletion:', error);
          // Mark error
          aggregationService.updateProgress({
            status: 'error',
            currentSourceId: null,
          });
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(() => {});
        }
      }

      res.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete source ${req.params.id}:`, error);
      next(error);
    }
  }

  async toggleSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const source = await prisma.source.findUnique({
        where: { id },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      const wasEnabled = source.enabled;

      const updatedSource = await prisma.source.update({
        where: { id },
        data: {
          enabled: !source.enabled,
        },
      });

      // Start progress tracking for the toggle operation
      aggregationService.updateProgress({
        totalSources: 1,
        currentSourceId: id,
        status: 'running',
        processedSources: 0,
        entriesProcessed: 0,
      });

      // Always trigger immediate incremental update when toggling (enabled state changed)
      try {
        if (wasEnabled && !updatedSource.enabled) {
          // Disabling: remove contributions
          await aggregationService.incrementalDeleteSource(id);
          logger.info(`Incremental delete (toggle off) completed for source ${id}`);
        } else if (!wasEnabled && updatedSource.enabled) {
          // Enabling: add contributions
          // Process source content first
          const processResult = await aggregationService.processSource(updatedSource);
          if (!processResult.success) {
            throw new Error(processResult.error || 'Failed to process source content');
          }
          const addResult = await aggregationService.incrementalAddSource(id);
          logger.info(
            `Incremental add (toggle on) completed for source ${id}: ${addResult.entriesProcessed} entries`
          );
        }
        // Mark completed
        aggregationService.updateProgress({
          status: 'completed',
          processedSources: 1,
          currentSourceId: null,
        });
      } catch (error) {
        logger.error('Incremental toggle failed:', error);
        // Mark error
        aggregationService.updateProgress({
          status: 'error',
          currentSourceId: null,
        });
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch(() => {});
      }

      res.json({
        status: 'success',
        data: {
          ...updatedSource,
          metadata: updatedSource.metadata ? JSON.parse(updatedSource.metadata) : null,
        },
      });
    } catch (error) {
      logger.error(`Failed to toggle source ${req.params.id}:`, error);
      next(error);
    }
  }

  async refreshSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const source = await prisma.source.findUnique({
        where: { id },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Store original enabled state
      const wasEnabled = source.enabled;

      // Temporarily enable the source if it was disabled
      if (!wasEnabled) {
        await prisma.source.update({
          where: { id },
          data: { enabled: true },
        });
      }

      // Start progress tracking
      aggregationService.updateProgress({
        totalSources: 1,
        currentSourceId: id,
        status: 'running',
        processedSources: 0,
        entriesProcessed: 0,
      });

      // Process this single source
      const result = await aggregationService.processSource(source);

      // Restore original enabled state
      if (!wasEnabled) {
        await prisma.source.update({
          where: { id },
          data: { enabled: false },
        });
      }

      if (!result.success) {
        // Mark error
        aggregationService.updateProgress({
          status: 'error',
          currentSourceId: null,
        });
        return next(createError(result.error || 'Failed to refresh source', 500));
      }

      // Mark completed
      aggregationService.updateProgress({
        status: 'completed',
        processedSources: 1,
        currentSourceId: null,
      });

      res.json({
        status: 'success',
        message: `Source ${id} refreshed successfully`,
        data: {
          entriesProcessed: result.entriesProcessed,
          contentChanged: result.contentChanged,
          format: result.format,
        },
      });
    } catch (error) {
      logger.error(`Failed to refresh source ${req.params.id}:`, error);
      next(error);
    }
  }

  async refreshCache(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const source = await prisma.source.findUnique({
        where: { id },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Delete existing content cache
      await prisma.sourceContent.deleteMany({
        where: { sourceId: id },
      });

      // Trigger immediate aggregation to re-fetch content
      try {
        await aggregationService.aggregateSources();
        logger.info('Immediate aggregation completed after cache refresh');
      } catch (error) {
        logger.error('Failed to perform immediate aggregation after cache refresh:', error);
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch((error) => {
          logger.error('Failed to trigger background aggregation after cache refresh:', error);
        });
      }

      res.json({
        status: 'success',
        message: 'Cache refreshed successfully',
      });
    } catch (error) {
      logger.error(`Failed to refresh cache for source ${req.params.id}:`, error);
      next(error);
    }
  }

  async refreshAllCache(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all enabled sources
      const sources = await prisma.source.findMany({
        where: { enabled: true },
      });

      // Delete content cache for all enabled sources
      for (const source of sources) {
        await prisma.sourceContent.deleteMany({
          where: { sourceId: source.id },
        });
      }

      // Trigger immediate aggregation to re-fetch all content
      try {
        await aggregationService.aggregateSources();
        logger.info('Immediate aggregation completed after bulk cache refresh');
      } catch (error) {
        logger.error('Failed to perform immediate aggregation after bulk cache refresh:', error);
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch((error) => {
          logger.error('Failed to trigger background aggregation after bulk cache refresh:', error);
        });
      }

      res.json({
        status: 'success',
        message: `Cache refreshed for ${sources.length} sources`,
      });
    } catch (error) {
      logger.error('Failed to refresh all cache:', error);
      next(error);
    }
  }

  /**
   * Detect the format of a source's content
   * GET /api/sources/:id/detect-format
   *
   * This endpoint analyzes the source's cached content and returns
   * the detected format with confidence score and metadata.
   */
  async detectFormat(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Fetch the source by ID
      const source = await prisma.source.findUnique({
        where: { id },
        include: {
          contentCache: true,
        },
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Check if source has cached content
      if (!source.contentCache || !source.contentCache.content) {
        return next(
          createError('Source has no cached content. Please refresh the source first.', 400)
        );
      }

      const content = source.contentCache.content;

      // Perform format detection
      const lines = content.split('\n').slice(0, 100); // Check first 100 lines

      let adblockPatternCount = 0;
      let standardPatternCount = 0;
      let totalPatternLines = 0;
      let elementHidingCount = 0;
      let allowRuleCount = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
          continue;
        }

        // Check for AdBlock patterns: ||domain^
        if (trimmedLine.match(/\|\|[^/s]+\^/)) {
          adblockPatternCount++;
          totalPatternLines++;

          // Check for allow rules (@@||domain^)
          if (trimmedLine.startsWith('@@')) {
            allowRuleCount++;
          }
        }

        // Check for element hiding rules (domain.com##selector)
        if (trimmedLine.includes('##')) {
          elementHidingCount++;
          totalPatternLines++;
        }

        // Check for standard hosts patterns: 0.0.0.0 domain or 127.0.0.1 domain
        if (trimmedLine.match(/^(0\.0\.0\.0|127\.0\.0\.1)\s+/)) {
          standardPatternCount++;
          totalPatternLines++;
        }
      }

      // Calculate confidence scores
      let adblockConfidence = 0;
      let standardConfidence = 0;

      if (totalPatternLines > 0) {
        adblockConfidence = ((adblockPatternCount + elementHidingCount) / totalPatternLines) * 100;
        standardConfidence = (standardPatternCount / totalPatternLines) * 100;
      }

      // Determine detected format based on confidence
      let detectedFormat: 'standard' | 'adblock' | 'auto' = 'auto';
      let confidence = 0;

      if (adblockConfidence > standardConfidence) {
        detectedFormat = 'adblock';
        confidence = adblockConfidence;
      } else if (standardConfidence > adblockConfidence) {
        detectedFormat = 'standard';
        confidence = standardConfidence;
      } else {
        detectedFormat = 'auto';
        confidence = 0;
      }

      // Return detection results
      res.json({
        status: 'success',
        data: {
          sourceId: source.id,
          sourceName: source.name,
          detectedFormat,
          confidence: Math.round(confidence * 100) / 100,
          manualFormat: source.format,
          metadata: {
            totalLinesAnalyzed: lines.length,
            totalPatternLines,
            adblockPatternCount,
            standardPatternCount,
            elementHidingCount,
            allowRuleCount,
            adblockConfidence: Math.round(adblockConfidence * 100) / 100,
            standardConfidence: Math.round(standardConfidence * 100) / 100,
          },
          recommendation:
            confidence >= 60
              ? `Format detected as ${detectedFormat} with ${Math.round(confidence)}% confidence`
              : 'Low confidence - format could not be reliably detected',
        },
      });
    } catch (error) {
      logger.error(`Failed to detect format for source ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Get health status of all sources
   * GET /api/sources/health
   *
   * Returns aggregated health information about all sources based on their latest fetch logs.
   */
  async getSourceHealth(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all sources with their latest fetch log
      const sources = await prisma.source.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          fetchLogs: {
            orderBy: { fetchedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              fetchedAt: true,
              errorMessage: true,
              responseTimeMs: true,
            },
          },
        },
      });

      // Calculate health stats
      let healthy = 0;
      let unhealthy = 0;
      let unknown = 0;
      const sourceHealthList = sources.map((source) => {
        const latestLog = source.fetchLogs[0];
        let status: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
        let lastChecked: string | null = null;
        let responseTime = 0;
        let errorMessage: string | undefined;
        const consecutiveFailures = 0;
        const contentChanged = false;

        if (latestLog) {
          lastChecked = latestLog.fetchedAt?.toISOString() || null;
          responseTime = latestLog.responseTimeMs || 0;
          errorMessage = latestLog.errorMessage || undefined;

          if (latestLog.status === 'SUCCESS') {
            status = 'healthy';
            healthy++;
          } else if (latestLog.status === 'ERROR' || latestLog.status === 'TIMEOUT') {
            status = 'unhealthy';
            unhealthy++;
          } else {
            unknown++;
          }
        } else {
          unknown++;
        }

        return {
          id: source.id,
          sourceId: source.id,
          status,
          lastChecked: lastChecked || '',
          responseTime,
          errorMessage,
          consecutiveFailures,
          contentChanged,
        };
      });

      const totalSources = sources.length;

      res.json({
        status: 'success',
        data: {
          totalSources,
          healthySources: healthy,
          unhealthySources: unhealthy,
          unknownSources: unknown,
          sources: sourceHealthList,
        },
      });
    } catch (error) {
      logger.error('Failed to get source health:', error);
      next(error);
    }
  }
}
