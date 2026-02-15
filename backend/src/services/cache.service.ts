import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Cache service for managing cached data
 */
export class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl || this.DEFAULT_TTL, serializedValue);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hits: number; misses: number; hitRate: number }> {
    try {
      const info = await redis.info('stats');
      // Parse Redis info to extract hits and misses
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      const hits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1], 10) : 0;
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return { hits, misses, hitRate };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  /**
   * Cache aggregation result
   */
  async cacheAggregationResult(resultId: string, data: unknown): Promise<void> {
    await this.set(`aggregation:${resultId}`, data, 3600); // 1 hour
  }

  /**
   * Get cached aggregation result
   */
  async getCachedAggregationResult<T>(resultId: string): Promise<T | null> {
    return this.get<T>(`aggregation:${resultId}`);
  }

  /**
   * Cache hosts list
   */
  async cacheHostsList(format: string, data: string): Promise<void> {
    await this.set(`hosts:${format}`, data, 1800); // 30 minutes
  }

  /**
   * Get cached hosts list
   */
  async getCachedHostsList(format: string): Promise<string | null> {
    return this.get<string>(`hosts:${format}`);
  }

  /**
   * Invalidate hosts cache
   */
  async invalidateHostsCache(): Promise<void> {
    await this.deletePattern('hosts:*');
  }

  /**
   * Cache source metadata
   */
  async cacheSourceMetadata(sourceId: string, data: unknown): Promise<void> {
    await this.set(`source:${sourceId}:metadata`, data, 300); // 5 minutes
  }

  /**
   * Get cached source metadata
   */
  async getCachedSourceMetadata<T>(sourceId: string): Promise<T | null> {
    return this.get<T>(`source:${sourceId}:metadata`);
  }

  /**
   * Invalidate source cache
   */
  async invalidateSourceCache(sourceId: string): Promise<void> {
    await this.delete(`source:${sourceId}:metadata`);
    await this.delete(`source:${sourceId}:content`);
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<void> {
    try {
      await redis.flushall();
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }
}

export const cacheService = new CacheService();
