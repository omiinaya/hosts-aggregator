import { AggregationService } from '../../services/aggregation.service';
import { createTestSource, generateStandardHostsContent, generateABPContent } from '../../__tests__/helpers/test-utils';
import { prisma } from '../../config/database';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    service = new AggregationService();
    jest.clearAllMocks();
  });

  describe('aggregateSources', () => {
    it('should return empty result when no sources enabled', async () => {
      const result = await service.aggregateSources();

      expect(result.totalSources).toBe(0);
      expect(result.totalEntries).toBe(0);
      expect(result.uniqueEntries).toBe(0);
    });

    it('should process single URL source successfully', async () => {
      const source = await createTestSource({
        name: 'Test Source',
        url: 'http://example.com/hosts',
        type: 'URL',
        enabled: true,
      });

      const mockContent = generateStandardHostsContent(['example.com', 'test.com']);
      mockedAxios.get.mockResolvedValueOnce({ data: mockContent });

      const result = await service.aggregateSources();

      expect(result.totalSources).toBe(1);
      expect(result.totalEntries).toBe(2);
      expect(result.uniqueEntries).toBe(2);
    });

    it('should deduplicate entries from multiple sources', async () => {
      const source1 = await createTestSource({
        name: 'Source 1',
        url: 'http://example1.com/hosts',
        type: 'URL',
        enabled: true,
      });

      const source2 = await createTestSource({
        name: 'Source 2',
        url: 'http://example2.com/hosts',
        type: 'URL',
        enabled: true,
      });

      const content1 = generateStandardHostsContent(['example.com', 'unique1.com']);
      const content2 = generateStandardHostsContent(['example.com', 'unique2.com']);

      mockedAxios.get
        .mockResolvedValueOnce({ data: content1 })
        .mockResolvedValueOnce({ data: content2 });

      const result = await service.aggregateSources();

      expect(result.totalSources).toBe(2);
      expect(result.totalEntries).toBe(4);
      expect(result.uniqueEntries).toBe(3); // example.com deduplicated
      expect(result.duplicatesRemoved).toBe(1);
    });

    it('should respect allow rules', async () => {
      const source = await createTestSource({
        name: 'Test Source',
        url: 'http://example.com/hosts',
        type: 'URL',
        enabled: true,
      });

      // Use ABP format for both block and allow patterns
      const content = `||blocked.com^
@@||allowed.com^
||allowed.com^`;

      mockedAxios.get.mockResolvedValueOnce({ data: content });

      const result = await service.aggregateSources();

      expect(result.blockedDomains).toContain('blocked.com');
      expect(result.blockedDomains).not.toContain('allowed.com');
    });

    it('should handle failed sources gracefully', async () => {
      const source1 = await createTestSource({
        name: 'Good Source',
        url: 'http://good.com/hosts',
        type: 'URL',
        enabled: true,
      });

      const source2 = await createTestSource({
        name: 'Bad Source',
        url: 'http://bad.com/hosts',
        type: 'URL',
        enabled: true,
      });

      mockedAxios.get
        .mockResolvedValueOnce({ data: '0.0.0.0 example.com' })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await service.aggregateSources();

      expect(result.totalSources).toBe(1); // Only successful source counted
      expect(result.totalEntries).toBe(1);
    });
  });

  describe('getAggregationStats', () => {
    it('should return correct statistics', async () => {
      await createTestSource({
        name: 'Source 1',
        url: 'http://example.com/hosts',
        type: 'URL',
        enabled: true,
      });

      await createTestSource({
        name: 'Source 2',
        url: 'http://example2.com/hosts',
        type: 'URL',
        enabled: false,
      });

      const stats = await service.getAggregationStats();

      expect(stats.totalSources).toBe(2);
      expect(stats.enabledSources).toBe(1);
    });
  });
});
