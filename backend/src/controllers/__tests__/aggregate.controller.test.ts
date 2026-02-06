import { Request, Response, NextFunction } from 'express';
import { AggregateController } from '../aggregate.controller';
import { AggregationService } from '../../services/aggregation.service';

// Mock AggregationService
jest.mock('../../services/aggregation.service');

describe('AggregateController', () => {
  let controller: AggregateController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AggregateController();
    mockReq = {};
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('aggregate', () => {
    it('should trigger aggregation and return stats', async () => {
      const mockStats = {
        totalSources: 5,
        totalEntries: 1000,
        uniqueEntries: 950,
        duplicatesRemoved: 50,
      };

      (AggregationService.prototype.aggregateSources as jest.Mock).mockResolvedValue(mockStats);

      await controller.aggregate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStats,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle aggregation errors', async () => {
      const error = new Error('Aggregation failed');
      (AggregationService.prototype.aggregateSources as jest.Mock).mockRejectedValue(error);

      await controller.aggregate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('getAggregated', () => {
    it('should return latest aggregation', async () => {
      const mockAggregation = {
        id: 'agg-1',
        timestamp: new Date(),
        totalSources: 5,
        uniqueEntries: 950,
      };

      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(mockAggregation);

      await controller.getAggregated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockAggregation,
      });
    });

    it('should return 404 when no aggregation exists', async () => {
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(null);

      await controller.getAggregated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('No aggregation results found');
      expect(error.statusCode).toBe(404);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockRejectedValue(error);

      await controller.getAggregated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAggregationStats', () => {
    it('should return aggregation stats', async () => {
      const mockStats = {
        totalSources: 10,
        enabledSources: 8,
        totalHosts: 5000,
        lastAggregation: new Date(),
      };

      (AggregationService.prototype.getAggregationStats as jest.Mock).mockResolvedValue(mockStats);

      await controller.getAggregationStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStats,
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Stats error');
      (AggregationService.prototype.getAggregationStats as jest.Mock).mockRejectedValue(error);

      await controller.getAggregationStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAggregationHistory', () => {
    it('should return aggregation history', async () => {
      const mockAggregation = {
        id: 'agg-1',
        timestamp: new Date(),
        totalSources: 5,
      };

      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(mockAggregation);

      await controller.getAggregationHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: [mockAggregation],
      });
    });

    it('should return empty array when no aggregation exists', async () => {
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(null);

      await controller.getAggregationHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: [],
      });
    });

    it('should handle errors', async () => {
      const error = new Error('History error');
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockRejectedValue(error);

      await controller.getAggregationHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAggregationStatus', () => {
    it('should return completed status when aggregation exists', async () => {
      const mockAggregation = {
        id: 'agg-1',
        timestamp: new Date(),
      };

      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(mockAggregation);

      await controller.getAggregationStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0,
        },
      });
    });

    it('should return idle status when no aggregation exists', async () => {
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockResolvedValue(null);

      await controller.getAggregationStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          status: 'idle',
          progress: 100,
          totalSources: 0,
          processedSources: 0,
        },
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Status error');
      (AggregationService.prototype.getLatestAggregation as jest.Mock).mockRejectedValue(error);

      await controller.getAggregationStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
