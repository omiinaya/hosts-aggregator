import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AutoAggregationService } from '../services/auto-aggregation.service';
import { FileService } from '../services/file.service';
import { AggregationService } from '../services/aggregation.service';

export class SourcesController {
  private autoAggregationService: AutoAggregationService;
  private fileService: FileService;
  private aggregationService: AggregationService;

  constructor() {
    this.autoAggregationService = new AutoAggregationService();
    this.fileService = new FileService();
    this.aggregationService = new AggregationService();
  }
  async getAllSources(req: Request, res: Response, next: NextFunction) {
    try {
      const sources = await prisma.source.findMany({
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        status: 'success',
        data: sources.map(source => ({
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null
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
        where: { id }
      });

      if (!source) {
        return next(createError('Source not found', 404));
      }

      res.json({
        status: 'success',
        data: {
          ...source,
          metadata: source.metadata ? JSON.parse(source.metadata) : null
        }
      });
    } catch (error) {
      logger.error(`Failed to get source ${req.params.id}:`, error);
      next(error);
    }
  }

  async createSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, url, enabled = true, metadata } = req.body;

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
      const { name, url, enabled, metadata } = req.body;

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

      // Clear cache if URL is being updated
      const urlChanged = url !== undefined && url !== existingSource.url;
      if (urlChanged) {
        await this.fileService.deleteCachedContent(id);
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);

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

      // Delete cached content BEFORE removing from database
      await this.fileService.deleteCachedContent(id);

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

      // Update last checked timestamp
      await prisma.source.update({
        where: { id },
        data: {
          lastChecked: new Date()
        }
      });

      res.json({
        status: 'success',
        message: 'Source refresh initiated'
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

      // Delete existing cache file
      await this.fileService.deleteCachedContent(id);

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

      // Delete cache for all enabled sources
      for (const source of sources) {
        await this.fileService.deleteCachedContent(source.id);
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
}