import { Request, Response, NextFunction } from 'express';
import { aggregationService } from '../services/aggregation.service';
import { logger } from '../utils/logger';

export class AggregateController {
  constructor() {}

  async aggregate(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await aggregationService.aggregateSources();

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      logger.error('Aggregation failed:', error);
      next(error);
    }
  }

  async getAggregated(req: Request, res: Response, next: NextFunction) {
    try {
      const latestAggregation = await aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        // Return empty data instead of 404
        return res.json({
          status: 'success',
          data: null,
          message: 'No aggregation results yet. Add sources and trigger aggregation.',
        });
      }

      res.json({
        status: 'success',
        data: latestAggregation,
      });
    } catch (error) {
      logger.error('Failed to get aggregated data:', error);
      next(error);
    }
  }

  async getAggregationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await aggregationService.getAggregationStats();

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get aggregation stats:', error);
      next(error);
    }
  }

  async getAggregationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      // Return latest aggregation with source details
      const latestAggregation = await aggregationService.getLatestAggregation();

      res.json({
        status: 'success',
        data: latestAggregation ? [latestAggregation] : [],
      });
    } catch (error) {
      logger.error('Failed to get aggregation history:', error);
      next(error);
    }
  }

  async getAggregationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // For now, return a simple status based on latest aggregation
      const latestAggregation = await aggregationService.getLatestAggregation();

      res.json({
        status: 'success',
        data: {
          status: latestAggregation ? 'completed' : 'idle',
          progress: 100,
          totalSources: 0,
          processedSources: 0,
        },
      });
    } catch (error) {
      logger.error('Failed to get aggregation status:', error);
      next(error);
    }
  }

  async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const progress = aggregationService.getProgress();
      res.json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      logger.error('Failed to get aggregation progress:', error);
      next(error);
    }
  }
}
