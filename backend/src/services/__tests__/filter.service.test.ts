import { FilterService } from '../filter.service';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('FilterService', () => {
  let filterService: FilterService;

  beforeEach(() => {
    filterService = new FilterService();
    jest.clearAllMocks();
  });

  describe('applyFilters', () => {
    it('should return all entries when no filters active', () => {
      const entries = ['example.com', 'test.com'];
      const result = filterService.applyFilters(entries, {});
      expect(result).toEqual(entries);
    });

    it('should filter by allowlist', () => {
      const entries = ['example.com', 'test.com', 'blocked.com'];
      const result = filterService.applyFilters(entries, { allow: ['example', 'test'] });
      expect(result).toContain('example.com');
      expect(result).toContain('test.com');
      expect(result).not.toContain('blocked.com');
    });

    it('should filter by denylist', () => {
      const entries = ['example.com', 'test.com', 'spam.com'];
      const result = filterService.applyFilters(entries, { deny: ['spam'] });
      expect(result).not.toContain('spam.com');
      expect(result).toContain('example.com');
    });

    it('should combine allow and deny filters', () => {
      const entries = ['example.com', 'test.com', 'spam.com'];
      const result = filterService.applyFilters(entries, { allow: ['example', 'test'], deny: ['test'] });
      expect(result).toContain('example.com');
      expect(result).not.toContain('test.com');
      expect(result).not.toContain('spam.com');
    });

    it('should handle regex patterns', () => {
      const entries = ['example.com', 'test123.com', 'abc.com'];
      const result = filterService.applyFilters(entries, { allowRegex: ['^[a-z]+\.com$'] });
      expect(result).toContain('example.com');
      expect(result).toContain('abc.com');
    });

    it('should handle empty entries', () => {
      const result = filterService.applyFilters([], { allow: ['example'] });
      expect(result).toEqual([]);
    });

    it('should handle malformed patterns gracefully', () => {
      const entries = ['example.com'];
      expect(() => filterService.applyFilters(entries, { allowRegex: ['[invalid'] })).not.toThrow();
    });
  });

  describe('validateFilter', () => {
    it('should validate simple patterns', () => {
      expect(filterService.validateFilter('example')).toBe(true);
      expect(filterService.validateFilter('')).toBe(false);
    });

    it('should reject dangerous patterns', () => {
      expect(filterService.validateFilter('.*')).toBe(false);
    });
  });
});
