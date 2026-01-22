import axios from 'axios';
import { HostsParser } from './parser.service';
import { FileService } from './file.service';
import { prisma } from '../config/database';
import { AggregationStats, ParsedEntry } from '../types';
import { logger } from '../utils/logger';

export class AggregationService {
  private parser: HostsParser;
  private fileService: FileService;

  constructor() {
    this.parser = new HostsParser();
    this.fileService = new FileService();
  }

  async aggregateSources(): Promise<AggregationStats> {
    const startTime = Date.now();
    
    try {
      // Get all enabled sources
      const sources = await prisma.source.findMany({
        where: { enabled: true }
      });

      if (sources.length === 0) {
        return {
          totalSources: 0,
          totalEntries: 0,
          uniqueEntries: 0,
          duplicatesRemoved: 0,
          processingTime: Date.now() - startTime,
          blockedDomains: [],
          allowedDomains: []
        };
      }

      const allEntries: ParsedEntry[] = [];
      const processedSources: string[] = [];

      // Process each source
      for (const source of sources) {
        try {
          const content = await this.fetchSourceContent(source);
          const entries = this.parser.parseContent(content, source.id, 'standard');
          
          allEntries.push(...entries);
          processedSources.push(source.id);

          // Update source entry count
          await prisma.source.update({
            where: { id: source.id },
            data: {
              entryCount: entries.length,
              lastFetched: new Date(),
              lastFetchStatus: 'SUCCESS'
            }
          });
        } catch (error) {
          logger.error(`Failed to process source ${source.id}:`, error);
          
          await prisma.source.update({
            where: { id: source.id },
            data: {
              lastFetched: new Date(),
              lastFetchStatus: 'ERROR'
            }
          });
        }
      }

      // Process entries to remove duplicates and apply allow rules
      const result = this.processEntries(allEntries);

      // Generate unified hosts file
      const filePath = await this.fileService.generateUnifiedHostsFile(result.blockedDomains);

      // Save aggregation result
      await prisma.aggregationResult.create({
        data: {
          totalSources: processedSources.length,
          totalEntries: allEntries.length,
          uniqueEntries: result.blockedDomains.length,
          duplicatesRemoved: allEntries.length - result.blockedDomains.length,
          filePath,
          sourcesUsed: JSON.stringify(processedSources)
        }
      });

      return {
        totalSources: processedSources.length,
        totalEntries: allEntries.length,
        uniqueEntries: result.blockedDomains.length,
        duplicatesRemoved: allEntries.length - result.blockedDomains.length,
        processingTime: Date.now() - startTime,
        blockedDomains: result.blockedDomains,
        allowedDomains: result.allowedDomains
      };
    } catch (error) {
      logger.error('Aggregation failed:', error);
      throw error;
    }
  }

  private async fetchSourceContent(source: any): Promise<string> {
    if (source.type === 'URL' && source.url) {
      // Try to get cached content first
      const cachedContent = await this.fileService.getCachedContent(source.id);
      if (cachedContent) {
        return cachedContent;
      }

      // Fetch from URL
      const response = await axios.get(source.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Hosts-Aggregator/1.0'
        }
      });

      const content = response.data;
      
      // Cache the content
      await this.fileService.cacheSourceContent(source.id, content);
      
      return content;
    } else if (source.type === 'FILE' && source.filePath) {
      return await this.fileService.getCachedContent(source.id) || '';
    } else {
      throw new Error(`Invalid source type or missing URL/filePath for source ${source.id}`);
    }
  }

  private processEntries(entries: ParsedEntry[]): {
    blockedDomains: string[];
    allowedDomains: string[];
  } {
    const blocked = new Set<string>();
    const allowed = new Set<string>();

    // First pass: collect allow rules
    for (const entry of entries) {
      if (entry.type === 'allow') {
        allowed.add(entry.domain);
      }
    }

    // Second pass: collect block rules (excluding allowed domains)
    for (const entry of entries) {
      if (entry.type === 'block' && !allowed.has(entry.domain)) {
        blocked.add(entry.domain);
      }
    }

    return {
      blockedDomains: Array.from(blocked).sort(),
      allowedDomains: Array.from(allowed).sort()
    };
  }

  async getLatestAggregation(): Promise<any | null> {
    try {
      const result = await prisma.aggregationResult.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      return result;
    } catch (error) {
      logger.error('Failed to get latest aggregation:', error);
      return null;
    }
  }

  async getAggregationStats(): Promise<{
    totalSources: number;
    enabledSources: number;
    totalEntries: number;
    lastAggregation: Date | null;
  }> {
    try {
      const totalSources = await prisma.source.count();
      const enabledSources = await prisma.source.count({
        where: { enabled: true }
      });

      const latestAggregation = await this.getLatestAggregation();

      return {
        totalSources,
        enabledSources,
        totalEntries: latestAggregation?.uniqueEntries || 0,
        lastAggregation: latestAggregation?.timestamp || null
      };
    } catch (error) {
      logger.error('Failed to get aggregation stats:', error);
      throw error;
    }
  }
}