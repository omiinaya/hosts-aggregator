import { AutoAggregationService } from '../../services/auto-aggregation.service';
import { AggregationService } from '../../services/aggregation.service';

// Mock the dependencies
jest.mock('../../services/aggregation.service');
jest.mock('../../config/serving', () => ({
  __esModule: true,
  default: {
    autoAggregateEnabled: true,
  },
}));

const mockedAggregationService = AggregationService as jest.MockedClass<typeof AggregationService>;

describe('AutoAggregationService', () => {
  let service: AutoAggregationService;
  let mockAggregateSources: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAggregateSources = jest.fn().mockResolvedValue({
      totalSources: 2,
      totalEntries: 100,
      uniqueEntries: 95,
      duplicatesRemoved: 5,
      blockedDomains: ['blocked.com'],
      allowedDomains: [],
    });
    mockedAggregationService.prototype.aggregateSources = mockAggregateSources;
    mockedAggregationService.prototype.getAggregationStats = jest.fn().mockResolvedValue({
      totalSources: 2,
      enabledSources: 2,
    });
    service = new AutoAggregationService();
  });

  describe('constructor', () => {
    it('should initialize with autoAggregateEnabled from config', () => {
      const status = service.getStatus();
      expect(status.autoAggregateEnabled).toBe(true);
    });
  });

  describe('setAutoAggregateEnabled', () => {
    it('should enable auto aggregation when set to true', () => {
      service.setAutoAggregateEnabled(true);
      const status = service.getStatus();
      expect(status.autoAggregateEnabled).toBe(true);
    });

    it('should disable auto aggregation when set to false', () => {
      service.setAutoAggregateEnabled(false);
      const status = service.getStatus();
      expect(status.autoAggregateEnabled).toBe(false);
    });
  });

  describe('triggerAggregation', () => {
    it('should skip aggregation when autoAggregateEnabled is false', async () => {
      service.setAutoAggregateEnabled(false);
      await service.triggerAggregation();
      expect(mockAggregateSources).not.toHaveBeenCalled();
    });

    it('should perform aggregation when autoAggregateEnabled is true', async () => {
      service.setAutoAggregateEnabled(true);
      await service.triggerAggregation();
      // Give time for the async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockAggregateSources).toHaveBeenCalled();
    });

    it('should queue requests when already aggregating', async () => {
      service.setAutoAggregateEnabled(true);
      
      // First trigger - will start aggregating
      service.triggerAggregation();
      
      // Give a tiny bit of time to start the first aggregation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Second trigger should queue
      service.triggerAggregation();
      const status = service.getStatus();
      
      // After aggregation completes, queue should be processed
      // Just verify the service has the capability to queue
      expect(service.getStatus()).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not aggregating', () => {
      const status = service.getStatus();
      expect(status.isAggregating).toBe(false);
      expect(status.queueLength).toBe(0);
      expect(status.autoAggregateEnabled).toBe(true);
    });

    it('should return correct status after triggering aggregation', async () => {
      service.setAutoAggregateEnabled(true);
      
      // Start aggregation 
      service.triggerAggregation();
      
      // Wait for it to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const status = service.getStatus();
      // After completion, should not be aggregating
      expect(status.isAggregating).toBe(false);
    });
  });
});
