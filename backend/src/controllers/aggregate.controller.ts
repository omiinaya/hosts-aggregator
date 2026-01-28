import { Request, Response, NextFunction } from 'express';
import { AggregationService } from '../services/aggregation.service';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class AggregateController {
  private aggregationService: AggregationService;

  constructor() {
    this.aggregationService = new AggregationService();
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

}
