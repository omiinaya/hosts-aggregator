import { ParsedEntry } from '../types';
import { logger } from '../utils/logger';

/**
 * Internal interface for ABP pattern parsing results
 */
interface ABPParseResult {
  domain: string;
  fullPattern: string;
  type: 'block' | 'allow' | 'element';
}

export class HostsParser {
  parseStandardHosts(content: string, sourceId: string): ParsedEntry[] {
    const lines = content.split('\n');
    const entries: ParsedEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('[')) continue;

      // Parse IP and domains
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const domains = parts.slice(1);

        for (const domain of domains) {
          if (this.isValidDomain(domain)) {
            entries.push({
              domain,
              source: sourceId,
              type: 'block',
              lineNumber: i + 1,
            });
          }
        }
      }
    }

    return entries;
  }

  parseAdblock(content: string, sourceId: string): ParsedEntry[] {
    const lines = content.split('\n');
    const entries: ParsedEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, comments, and section headers
      if (!line || line.startsWith('!') || line.startsWith('[')) continue;

      // Parse adblock patterns
      const result = this.extractDomainAndPatternFromAdblock(line);
      if (result && this.isValidDomain(result.domain)) {
        entries.push({
          domain: result.domain,
          source: sourceId,
          type: result.type,
          lineNumber: i + 1,
          comment: result.fullPattern, // Store full pattern in comment field for output generation
        });
      }
    }

    return entries;
  }

  parseContent(
    content: string,
    sourceId: string,
    format: 'standard' | 'adblock' | 'auto' = 'standard'
  ): ParsedEntry[] {
    try {
      // Handle 'auto' format by defaulting to 'standard' (no manual override)
      const effectiveFormat = format === 'auto' ? 'standard' : format;

      if (effectiveFormat === 'adblock') {
        return this.parseAdblock(content, sourceId);
      } else {
        return this.parseStandardHosts(content, sourceId);
      }
    } catch (error) {
      logger.error(`Failed to parse content for source ${sourceId}:`, error);
      return [];
    }
  }

  /**
   * Extract domain from ||domain.com^ patterns
   * Maintains backward compatibility with existing code
   * @param pattern ABP pattern string
   * @returns Extracted domain or null
   */
  private extractDomainFromAdblock(pattern: string): string | null {
    const result = this.extractDomainAndPatternFromAdblock(pattern);
    return result ? result.domain : null;
  }

  /**
   * Extract domain and full pattern from ABP format
   * Handles path patterns (||domain.com/path^) and wildcard patterns (||*domain.com^)
   * Also handles element hiding rules (domain.com##selector)
   * @param pattern ABP pattern string
   * @returns Parse result with domain, full pattern, and type
   */
  private extractDomainAndPatternFromAdblock(pattern: string): ABPParseResult | null {
    // Handle element hiding rules (domain.com##selector)
    if (pattern.includes('##')) {
      const parts = pattern.split('##');
      const domain = parts[0].trim();
      if (domain.length > 0) {
        return {
          domain,
          fullPattern: pattern,
          type: 'element',
        };
      }
      return null;
    }

    // Handle exception rules (@@||domain.com^)
    const isException = pattern.startsWith('@@');
    const cleanPattern = isException ? pattern.substring(2) : pattern;

    // Validate ABP pattern starts with ||
    if (!cleanPattern.startsWith('||')) {
      return null;
    }

    // Extract domain - be more flexible with special characters
    // eslint-disable-next-line no-useless-escape
    const match = cleanPattern.match(/\|\|([^\^]+)/);
    if (!match) {
      return null;
    }

    let domain = match[1].trim();

    // Remove trailing path if present
    if (domain.includes('/')) {
      domain = domain.split('/')[0];
    }

    // Remove wildcard prefix if present
    if (domain.startsWith('*')) {
      domain = domain.substring(1);
    }

    if (domain.length === 0) {
      return null;
    }

    return {
      domain,
      fullPattern: pattern,
      type: isException ? 'allow' : 'block',
    };
  }

  /**
   * Convert standard hosts format entries to ABP format
   * @param entries Array of ParsedEntry objects in standard format
   * @returns Array of strings in ABP format
   */
  convertToABP(entries: ParsedEntry[]): string[] {
    const abpEntries: string[] = [];

    for (const entry of entries) {
      let abpPattern: string;

      if (entry.type === 'allow') {
        abpPattern = `@@||${entry.domain}^`;
      } else if (entry.type === 'element') {
        // Element hiding rules are stored in comment field
        abpPattern = entry.comment || `${entry.domain}##`;
      } else {
        // Default to block type
        abpPattern = `||${entry.domain}^`;
      }

      abpEntries.push(abpPattern);
    }

    return abpEntries;
  }

  /**
   * Convert ABP format entries to standard hosts format
   * @param entries Array of ParsedEntry objects in ABP format
   * @returns Array of strings in standard hosts format
   */
  convertToStandard(entries: ParsedEntry[]): string[] {
    const standardEntries: string[] = [];

    for (const entry of entries) {
      // Skip element hiding rules as they don't have a standard hosts equivalent
      if (entry.type === 'element') {
        continue;
      }

      // Standard hosts format: 0.0.0.0 domain for block, or just domain for allow
      let standardLine: string;

      if (entry.type === 'allow') {
        // Allowlist entries - just the domain
        standardLine = entry.domain;
      } else {
        // Blocklist entries - use 0.0.0.0 prefix
        standardLine = `0.0.0.0 ${entry.domain}`;
      }

      standardEntries.push(standardLine);
    }

    return standardEntries;
  }

  /**
   * Validate ABP special characters and format
   * @param pattern ABP pattern string to validate
   * @returns true if valid, false otherwise
   */
  private isValidABPPattern(pattern: string): boolean {
    // Handle element hiding rules
    if (pattern.includes('##')) {
      const parts = pattern.split('##');
      if (parts.length !== 2) return false;
      const domain = parts[0].trim();
      return this.isValidDomain(domain);
    }

    // Must start with || or @@||
    if (!pattern.startsWith('||') && !pattern.startsWith('@@||')) {
      return false;
    }

    // Must end with ^
    if (!pattern.endsWith('^')) {
      return false;
    }

    return true;
  }

  /**
   * Validate domain format
   * @param domain Domain string to validate
   * @returns true if valid, false otherwise
   */
  private isValidDomain(domain: string): boolean {
    // Allow empty strings (for wildcard patterns)
    if (!domain || domain.length === 0) {
      return true;
    }

    // Allow IP addresses
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipRegex.test(domain)) {
      return true;
    }

    // Allow wildcards at start or end
    if (domain.startsWith('*') || domain.endsWith('*')) {
      return true;
    }

    // Require at least one dot (TLD) for valid domains
    // This filters out incomplete patterns like "||incomplete"
    if (!domain.includes('.')) {
      return false;
    }

    // Standard domain validation (relaxed to allow underscores)
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9_-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9_-]{0,61}[a-zA-Z0-9])?)*$/;
    const isValid = domainRegex.test(domain) && domain.length <= 253;

    // Debug logging for rejected entries
    if (!isValid && domain.length > 0) {
      logger.debug(`Domain validation failed: "${domain}"`);
    }

    return isValid;
  }
}
