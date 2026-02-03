import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AutoAggregationService } from '../services/auto-aggregation.service';
import { AggregationService } from '../services/aggregation.service';
import { HostsParser } from '../services/parser.service';

export class SourcesController {
  private autoAggregationService: AutoAggregationService;
  private aggregationService: AggregationService;
  private parser: HostsParser;

  constructor() {
    this.autoAggregationService = new AutoAggregationService();
    this.aggregationService = new AggregationService();
    this.parser = new HostsParser();
  }

  async getAllSources(req: Request, res: Response, next: NextFunction) {
    try {
      const sources = await prisma.source.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              hosts: true
            }
          },
          contentCache: {
            select: {
              fetchedAt: true,
              entryCount: true
            }
          },
          fetchLogs: {
            orderBy: { fetchedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              fetchedAt: true
            }
          }
        }
      });

      res.json({
        status: 'success',
        data: sources.map(source => ({
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null,
          hostCount: source._count.hosts,
          lastFetched: source.contentCache?.fetchedAt || null,
          lastFetchStatus: source.fetchLogs[0]?.status || null,
          entryCount: source.contentCache?.entryCount || 0,
          _count: undefined,
          contentCache: undefined,
          fetchLogs: undefined
        }))
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
              hosts: true
            }
          },
          contentCache: {
            select: {
              fetchedAt: true,
              entryCount: true,
              lineCount: true,
              contentHash: true
            }
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
              fetchedAt: true
            }
          },
          hosts: {
            select: {
              domain: true,
              entryType: true
            },
            take: 100
          }
        }
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
          _count: undefined
        }
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
        where: { name }
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
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });

      // Trigger immediate aggregation if source is enabled
      if (enabled) {
        try {
          await this.aggregationService.aggregateSources();
          logger.info('Immediate aggregation completed after source creation');
        } catch (error) {
          logger.error('Failed to perform immediate aggregation after source creation:', error);
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(error => {
            logger.error('Failed to trigger background aggregation after source creation:', error);
          });
        }
      }

      res.status(201).json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null
        }
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
        where: { id }
      });

      if (!existingSource) {
        return next(createError('Source not found', 404));
      }

      // Check if new name conflicts with another source
      if (name && name !== existingSource.name) {
        const nameConflict = await prisma.source.findUnique({
          where: { name }
        });

        if (nameConflict) {
          return next(createError('Source with this name already exists', 409));
        }
      }

      // Clear content cache if URL is being updated
      const urlChanged = url !== undefined && url !== existingSource.url;
      if (urlChanged) {
        await prisma.sourceContent.deleteMany({
          where: { sourceId: id }
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
        data: updateData
      });

      // Trigger immediate aggregation if source is enabled or was enabled before update
      const shouldTriggerAggregation =
        (enabled !== undefined && enabled) ||
        (enabled === undefined && existingSource.enabled) ||
        urlChanged;

      if (shouldTriggerAggregation) {
        try {
          await this.aggregationService.aggregateSources();
          logger.info('Immediate aggregation completed after source update');
        } catch (error) {
          logger.error('Failed to perform immediate aggregation after source update:', error);
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(error => {
            logger.error('Failed to trigger background aggregation after source update:', error);
          });
        }
      }

      res.json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null
        }
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
        where: { id }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Cascade delete will handle related records (contentCache, hosts, fetchLogs)
      await prisma.source.delete({
        where: { id }
      });

      // Trigger immediate aggregation if source was enabled
      if (source.enabled) {
        try {
          await this.aggregationService.aggregateSources();
          logger.info('Immediate aggregation completed after source deletion');
        } catch (error) {
          logger.error('Failed to perform immediate aggregation after source deletion:', error);
          // Fall back to background aggregation
          this.autoAggregationService.triggerAggregation().catch(error => {
            logger.error('Failed to trigger background aggregation after source deletion:', error);
          });
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
        where: { id }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      const updatedSource = await prisma.source.update({
        where: { id },
        data: {
          enabled: !source.enabled
        }
      });

      // Always trigger immediate aggregation when toggling (enabled state changed)
      try {
        await this.aggregationService.aggregateSources();
        logger.info('Immediate aggregation completed after source toggle');
      } catch (error) {
        logger.error('Failed to perform immediate aggregation after source toggle:', error);
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch(error => {
          logger.error('Failed to trigger background aggregation after source toggle:', error);
        });
      }

      res.json({
        status: 'success',
        data: {
          ...updatedSource,
          metadata: updatedSource.metadata ? JSON.parse(updatedSource.metadata) : null
        }
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
        where: { id }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Trigger aggregation for this specific source
      try {
        await this.aggregationService.aggregateSources();
        logger.info(`Source ${id} refresh completed`);
      } catch (error) {
        logger.error(`Failed to refresh source ${id}:`, error);
        return next(createError('Failed to refresh source', 500));
      }

      res.json({
        status: 'success',
        message: 'Source refresh completed'
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
        where: { id }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Delete existing content cache
      await prisma.sourceContent.deleteMany({
        where: { sourceId: id }
      });

      // Trigger immediate aggregation to re-fetch content
      try {
        await this.aggregationService.aggregateSources();
        logger.info('Immediate aggregation completed after cache refresh');
      } catch (error) {
        logger.error('Failed to perform immediate aggregation after cache refresh:', error);
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch(error => {
          logger.error('Failed to trigger background aggregation after cache refresh:', error);
        });
      }

      res.json({
        status: 'success',
        message: 'Cache refreshed successfully'
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
        where: { enabled: true }
      });

      // Delete content cache for all enabled sources
      for (const source of sources) {
        await prisma.sourceContent.deleteMany({
          where: { sourceId: source.id }
        });
      }

      // Trigger immediate aggregation to re-fetch all content
      try {
        await this.aggregationService.aggregateSources();
        logger.info('Immediate aggregation completed after bulk cache refresh');
      } catch (error) {
        logger.error('Failed to perform immediate aggregation after bulk cache refresh:', error);
        // Fall back to background aggregation
        this.autoAggregationService.triggerAggregation().catch(error => {
          logger.error('Failed to trigger background aggregation after bulk cache refresh:', error);
        });
      }

      res.json({
        status: 'success',
        message: `Cache refreshed for ${sources.length} sources`
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
          contentCache: true
        }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      // Check if source has cached content
      if (!source.contentCache || !source.contentCache.content) {
        return next(createError('Source has no cached content. Please refresh the source first.', 400));
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
        if (trimmedLine.match(/\|\|[^\/\s]+\^/)) {
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
            standardConfidence: Math.round(standardConfidence * 100) / 100
          },
          recommendation: confidence >= 60 
            ? `Format detected as ${detectedFormat} with ${Math.round(confidence)}% confidence`
            : 'Low confidence - format could not be reliably detected'
        }
      });
    } catch (error) {
      logger.error(`Failed to detect format for source ${req.params.id}:`, error);
      next(error);
    }
  }
}
