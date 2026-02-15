import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn (classnames utility)', () => {
  it('should merge classnames', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('should handle empty strings', () => {
    const result = cn('foo', '', 'bar');
    expect(result).toBe('foo bar');
  });
});
