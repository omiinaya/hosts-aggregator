import { ParsedEntry } from '../types';
import { logger } from '../utils/logger';

export class HostsParser {
  parseStandardHosts(content: string, sourceId: string): ParsedEntry[] {
    const lines = content.split('\n');
    const entries: ParsedEntry[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;
      
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
              lineNumber: i + 1
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
      
      // Skip empty lines and comments
      if (!line || line.startsWith('!')) continue;
      
      // Parse adblock patterns
      const domain = this.extractDomainFromAdblock(line);
      if (domain && this.isValidDomain(domain)) {
        const type = line.startsWith('@@') ? 'allow' : 'block';
        
        entries.push({
          domain,
          source: sourceId,
          type,
          lineNumber: i + 1
        });
      }
    }
    
    return entries;
  }
  
  parseContent(content: string, sourceId: string, format: 'standard' | 'adblock' = 'standard'): ParsedEntry[] {
    try {
      if (format === 'adblock') {
        return this.parseAdblock(content, sourceId);
      } else {
        return this.parseStandardHosts(content, sourceId);
      }
    } catch (error) {
      logger.error(`Failed to parse content for source ${sourceId}:`, error);
      return [];
    }
  }
  
  private extractDomainFromAdblock(pattern: string): string | null {
    // Extract domain from ||domain.com^ patterns
    const match = pattern.match(/\|\|([^\^\/]+)/);
    return match ? match[1] : null;
  }
  
  private isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }
}