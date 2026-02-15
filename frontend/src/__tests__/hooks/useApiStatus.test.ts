import { describe, it, expect } from 'vitest';
import * as useApiStatus from '../../hooks/useApiStatus';

describe('useApiStatus', () => {
  it('should export the hook', () => {
    expect(useApiStatus.default).toBeDefined();
    expect(typeof useApiStatus.default).toBe('function');
  });
});
