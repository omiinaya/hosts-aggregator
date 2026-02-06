import { CacheService } from '../cache.service';
import { redis } from '../../config/redis';

// Mock Redis
jest.mock('../../config/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    info: jest.fn(),
    flushall: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
  });

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      const key = 'test-key';
      const cachedData = JSON.stringify({ data: 'test-value' });
      
      (redis.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await cacheService.get(key);

      expect(result).toEqual({ data: 'test-value' });
      expect(redis.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      (redis.get as jest.Mock).mockResolvedValue('invalid-json');

      const result = await cacheService.get('bad-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set cache value with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(redis.setex).toHaveBeenCalledWith(
        key,
        3600,
        JSON.stringify(value)
      );
    });

    it('should set cache value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const customTtl = 7200;

      (redis.setex as jest.Mock).mockResolvedValue('OK');

      await cacheService.set(key, value, customTtl);

      expect(redis.setex).toHaveBeenCalledWith(
        key,
        customTtl,
        JSON.stringify(value)
      );
    });

    it('should not throw on Redis error', async () => {
      (redis.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.set('key', 'value')).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete cache key', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await cacheService.delete('test-key');

      expect(redis.del).toHaveBeenCalledWith('test-key');
    });

    it('should not throw on Redis error', async () => {
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.delete('key')).resolves.not.toThrow();
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['hosts-aggregator:key1', 'hosts-aggregator:key2'];
      (redis.keys as jest.Mock).mockResolvedValue(keys);
      (redis.del as jest.Mock).mockResolvedValue(2);

      await cacheService.deletePattern('key*');

      expect(redis.keys).toHaveBeenCalledWith('key*');
      expect(redis.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle no matching keys', async () => {
      (redis.keys as jest.Mock).mockResolvedValue([]);

      await cacheService.deletePattern('nonexistent*');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      (redis.exists as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      (redis.exists as jest.Mock).mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent-key');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockInfo = `
        keyspace_hits:100
        keyspace_misses:50
      `;
      
      (redis.info as jest.Mock).mockResolvedValue(mockInfo);

      const result = await cacheService.getStats();

      expect(result).toMatchObject({
        hits: 100,
        misses: 50,
      });
      expect(result.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should handle zero hits and misses', async () => {
      const mockInfo = `
        keyspace_hits:0
        keyspace_misses:0
        total_keys_processed:0
      `;
      
      (redis.info as jest.Mock).mockResolvedValue(mockInfo);

      const result = await cacheService.getStats();

      expect(result.hitRate).toBe(0);
    });
  });

  describe('flushAll', () => {
    it('should clear all cache', async () => {
      (redis.flushall as jest.Mock).mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(redis.flushall).toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      (redis.flushall as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.flushAll()).resolves.not.toThrow();
    });
  });

  describe('cacheHostsList', () => {
    it('should cache hosts list', async () => {
      const format = 'standard';
      const hosts = '0.0.0.0 example.com\n0.0.0.0 test.com';
      
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      await cacheService.cacheHostsList(format, hosts);

      expect(redis.setex).toHaveBeenCalledWith(
        'hosts:standard',
        1800,
        JSON.stringify(hosts)
      );
    });
  });

  describe('getCachedHostsList', () => {
    it('should return cached hosts list', async () => {
      const format = 'standard';
      const hosts = '0.0.0.0 example.com\n0.0.0.0 test.com';
      
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(hosts));

      const result = await cacheService.getCachedHostsList(format);

      expect(result).toEqual(hosts);
    });

    it('should return null when hosts list not cached', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.getCachedHostsList('standard');

      expect(result).toBeNull();
    });
  });
});
