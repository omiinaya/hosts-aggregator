import { Request, Response, NextFunction } from 'express';
import { AggregationService } from '../services/aggregation.service';
import { FileService } from '../services/file.service';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class AggregateController {
  private aggregationService: AggregationService;
  private fileService: FileService;

  constructor() {
    this.aggregationService = new AggregationService();
    this.fileService = new FileService();
  }

  async aggregate(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.aggregationService.aggregateSources();

      res.json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      logger.error('Aggregation failed:', error);
      next(error);
    }
  }

  async getAggregated(req: Request, res: Response, next: NextFunction) {
    try {
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        return next(createError('No aggregation results found', 404));
      }

      res.json({
        status: 'success',
        data: latestAggregation
      });
    } catch (error) {
      logger.error('Failed to get aggregated data:', error);
      next(error);
    }
  }

  async downloadAggregated(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      let aggregation;
      if (id === 'latest') {
        aggregation = await this.aggregationService.getLatestAggregation();
      } else {
        aggregation = await this.aggregationService.getLatestAggregation(); // For now, always get latest
      }

      if (!aggregation) {
        return next(createError('No aggregation results found', 404));
      }

      const fileContent = await this.fileService.readGeneratedFile(aggregation.filePath);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="unified-hosts-${aggregation.timestamp.toISOString().split('T')[0]}.txt"`);
      res.send(fileContent);
    } catch (error) {
      logger.error('Failed to download aggregated file:', error);
      next(error);
    }
  }

  async getAggregationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.aggregationService.getAggregationStats();

      res.json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get aggregation stats:', error);
      next(error);
    }
  }

  async getAggregationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      // Return latest aggregation with source details
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      res.json({
        status: 'success',
        data: latestAggregation ? [latestAggregation] : []
      });
    } catch (error) {
      logger.error('Failed to get aggregation history:', error);
      next(error);
    }
  }

  async cleanup(req: Request, res: Response, next: NextFunction) {
    try {
      await this.fileService.cleanupOldFiles();

      res.json({
        status: 'success',
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      logger.error('Cleanup failed:', error);
      next(error);
    }
  }

  async getAggregationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // For now, return a simple status
      // In a real implementation, this would check if aggregation is running
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      res.json({
        status: 'success',
        data: {
          status: latestAggregation ? 'completed' : 'idle',
          progress: 100,
          totalSources: 0,
          processedSources: 0
        }
      });
    } catch (error) {
      logger.error('Failed to get aggregation status:', error);
      next(error);
    }
  }

  async getLatestHostsFile(req: Request, res: Response, next: NextFunction) {
    try {
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        return next(createError('No aggregation results found', 404));
      }

      res.json({
        status: 'success',
        data: {
          id: latestAggregation.id,
          filename: latestAggregation.filePath.split('/').pop() || 'unified-hosts.txt',
          size: latestAggregation.fileSizeBytes || 0,
          createdAt: latestAggregation.timestamp.toISOString(),
          totalEntries: latestAggregation.uniqueEntries
        }
      });
    } catch (error) {
      logger.error('Failed to get latest hosts file:', error);
      next(error);
    }
  }
}
