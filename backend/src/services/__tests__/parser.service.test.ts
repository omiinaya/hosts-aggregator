import { HostsParser } from '../../services/parser.service';

describe('HostsParser', () => {
  let parser: HostsParser;

  beforeEach(() => {
    parser = new HostsParser();
  });

  describe('parseStandardHosts', () => {
    it('should parse standard hosts format correctly', () => {
      const content = `
# This is a comment
0.0.0.0 example.com
127.0.0.1 test.com

# Another comment
0.0.0.0 ads.example.com tracking.example.com
      `;

      const result = parser.parseStandardHosts(content, 'test-source');

      expect(result).toHaveLength(4);
      expect(result).toContainEqual(
        expect.objectContaining({
          domain: 'example.com',
          source: 'test-source',
          type: 'block',
        })
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          domain: 'test.com',
          source: 'test-source',
          type: 'block',
        })
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          domain: 'ads.example.com',
          source: 'test-source',
          type: 'block',
        })
      );
    });

    it('should skip empty lines and comments', () => {
      const content = `
# Comment

0.0.0.0 domain.com

# Another comment

`;

      const result = parser.parseStandardHosts(content, 'test');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('domain.com');
    });

    it('should handle multiple domains on one line', () => {
      const content = '0.0.0.0 domain1.com domain2.com domain3.com';

      const result = parser.parseStandardHosts(content, 'test');

      expect(result).toHaveLength(3);
      expect(result.map(r => r.domain)).toEqual(['domain1.com', 'domain2.com', 'domain3.com']);
    });

    it('should return empty array for empty content', () => {
      const result = parser.parseStandardHosts('', 'test');
      expect(result).toEqual([]);
    });

    it('should include line numbers', () => {
      const content = `
# Line 1
0.0.0.0 domain.com
      `;

      const result = parser.parseStandardHosts(content, 'test');

      expect(result[0].lineNumber).toBe(3);
    });
  });

  describe('parseAdblock', () => {
    it('should parse ABP block patterns correctly', () => {
      const content = `
! Comment
||example.com^
||ads.example.com^

! Another comment
||tracking.com^
      `;

      const result = parser.parseAdblock(content, 'test-source');

      expect(result).toHaveLength(3);
      expect(result.every(r => r.type === 'block')).toBe(true);
      expect(result.map(r => r.domain)).toContain('example.com');
      expect(result.map(r => r.domain)).toContain('ads.example.com');
      expect(result.map(r => r.domain)).toContain('tracking.com');
    });

    it('should parse ABP allow patterns correctly', () => {
      const content = `
@@||trusted.com^
@@||safe.example.com^
      `;

      const result = parser.parseAdblock(content, 'test-source');

      expect(result).toHaveLength(2);
      expect(result.every(r => r.type === 'allow')).toBe(true);
      expect(result.map(r => r.domain)).toContain('trusted.com');
    });

    it('should handle element hiding rules', () => {
      const content = `
example.com##.ad
example.com##.banner
      `;

      const result = parser.parseAdblock(content, 'test');

      expect(result).toHaveLength(2);
      expect(result.every(r => r.type === 'element')).toBe(true);
    });

    it('should skip invalid patterns', () => {
      const content = `
invalid pattern
||incomplete
another bad line
||valid.com^
      `;

      const result = parser.parseAdblock(content, 'test');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('valid.com');
    });
  });

  describe('parseContent', () => {
    it('should use standard format when specified', () => {
      const content = '0.0.0.0 example.com';
      const result = parser.parseContent(content, 'test', 'standard');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('example.com');
    });

    it('should use adblock format when specified', () => {
      const content = '||example.com^';
      const result = parser.parseContent(content, 'test', 'adblock');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('example.com');
    });

    it('should default to standard format for auto', () => {
      const content = '0.0.0.0 example.com';
      const result = parser.parseContent(content, 'test', 'auto');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('example.com');
    });

    it('should handle errors gracefully', () => {
      // Testing error handling by passing invalid content
      const result = parser.parseContent(null as any, 'test', 'standard');
      expect(result).toEqual([]);
    });
  });

  describe('convertToABP', () => {
    it('should convert block entries to ABP format', () => {
      const entries = [
        { domain: 'example.com', source: 'test', type: 'block' as const, lineNumber: 1 },
        { domain: 'ads.com', source: 'test', type: 'block' as const, lineNumber: 2 },
      ];

      const result = parser.convertToABP(entries);

      expect(result).toEqual(['||example.com^', '||ads.com^']);
    });

    it('should convert allow entries to ABP format', () => {
      const entries = [
        { domain: 'trusted.com', source: 'test', type: 'allow' as const, lineNumber: 1 },
      ];

      const result = parser.convertToABP(entries);

      expect(result).toEqual(['@@||trusted.com^']);
    });

    it('should handle element hiding rules', () => {
      const entries = [
        { domain: 'example.com', source: 'test', type: 'element' as const, lineNumber: 1, comment: 'example.com##.ad' },
      ];

      const result = parser.convertToABP(entries);

      expect(result).toEqual(['example.com##.ad']);
    });
  });

  describe('convertToStandard', () => {
    it('should convert block entries to standard format', () => {
      const entries = [
        { domain: 'example.com', source: 'test', type: 'block' as const, lineNumber: 1 },
        { domain: 'ads.com', source: 'test', type: 'block' as const, lineNumber: 2 },
      ];

      const result = parser.convertToStandard(entries);

      expect(result).toEqual(['0.0.0.0 example.com', '0.0.0.0 ads.com']);
    });

    it('should skip element hiding rules', () => {
      const entries = [
        { domain: 'example.com', source: 'test', type: 'block' as const, lineNumber: 1 },
        { domain: 'example.com', source: 'test', type: 'element' as const, lineNumber: 2, comment: 'example.com##.ad' },
      ];

      const result = parser.convertToStandard(entries);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('0.0.0.0 example.com');
    });

    it('should handle allow entries', () => {
      const entries = [
        { domain: 'trusted.com', source: 'test', type: 'allow' as const, lineNumber: 1 },
      ];

      const result = parser.convertToStandard(entries);

      expect(result).toEqual(['trusted.com']);
    });
  });
});
