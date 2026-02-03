import axios from 'axios';
import crypto from 'crypto';
import { HostsParser } from './parser.service';
import { prisma } from '../config/database';
import { AggregationStats, ParsedEntry } from '../types';
import { logger } from '../utils/logger';

export class AggregationService {
  private parser: HostsParser;

  constructor() {
    this.parser = new HostsParser();
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
      const sourceStats: Map<string, { entries: number; duration: number; status: string }> = new Map();

      // Process each source
      for (const source of sources) {
        const sourceStartTime = Date.now();
        try {
          // Verify source still exists before processing
          const sourceExists = await prisma.source.findUnique({
            where: { id: source.id },
            select: { id: true }
          });

          if (!sourceExists) {
            logger.warn(`Source ${source.id} no longer exists, skipping`);
            continue;
          }

          const content = await this.fetchSourceContent(source);
          
          // Detect format with confidence scoring and manual override support
          const formatDetection = this.detectFormat(
            content,
            source.format as 'standard' | 'adblock' | 'auto' | undefined
          );
          
          // Store the detected format in SourceContent
          await this.storeDetectedFormat(source.id, formatDetection);
          
          const entries = this.parser.parseContent(content, source.id, formatDetection.format);

          // Store entries in database with host relationships
          await this.storeSourceEntries(source.id, entries);

          allEntries.push(...entries);
          processedSources.push(source.id);

          const duration = Date.now() - sourceStartTime;
          sourceStats.set(source.id, { entries: entries.length, duration, status: 'SUCCESS' });

          // Log successful fetch
          await this.logSourceFetch(source.id, 'SUCCESS', 200, null, duration, entries.length);
        } catch (error) {
          const duration = Date.now() - sourceStartTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to process source ${source.id}:`, error);

          sourceStats.set(source.id, { entries: 0, duration, status: 'ERROR' });

          // Log failed fetch (only if source still exists)
          try {
            await this.logSourceFetch(source.id, 'ERROR', null, errorMessage, duration, 0);
          } catch (logError) {
            logger.warn(`Could not log fetch error for source ${source.id}:`, logError);
          }
        }
      }

      // Process entries to remove duplicates and apply allow rules
      const result = this.processEntries(allEntries);

      // Save aggregation result with detailed statistics
      const aggregationResult = await prisma.aggregationResult.create({
        data: {
          totalSources: sources.length,
          successfulSources: processedSources.length,
          failedSources: sources.length - processedSources.length,
          totalEntries: allEntries.length,
          uniqueEntries: result.blockedDomains.length,
          duplicatesRemoved: allEntries.length - result.blockedDomains.length,
          allowEntries: result.allowedDomains.length,
          blockEntries: result.blockedDomains.length,
          processingTimeMs: Date.now() - startTime,
          triggeredBy: 'manual'
        }
      });

      // Create aggregation source records
      for (const [sourceId, stats] of sourceStats) {
        try {
          await prisma.aggregationSource.create({
            data: {
              aggregationResultId: aggregationResult.id,
              sourceId,
              entriesContributed: stats.entries,
              fetchStatus: stats.status as 'SUCCESS' | 'ERROR' | 'CACHED' | 'SKIPPED',
              fetchDurationMs: stats.duration
            }
          });
        } catch (error) {
          logger.warn(`Could not create aggregation source record for ${sourceId}:`, error);
        }
      }

      // Create aggregation host records
      const domainToSources = new Map<string, string[]>();
      for (const entry of allEntries) {
        if (entry.type === 'block' && !domainToSources.has(entry.domain)) {
          domainToSources.set(entry.domain, []);
        }
        if (entry.type === 'block') {
          const sources = domainToSources.get(entry.domain)!;
          if (!sources.includes(entry.source)) {
            sources.push(entry.source);
          }
        }
      }

      for (const domain of result.blockedDomains) {
        try {
          // Use findFirst since normalized is no longer unique (just indexed)
          const hostEntry = await prisma.hostEntry.findFirst({
            where: { normalized: domain.toLowerCase() }
          });

          if (hostEntry) {
            const sourceIds = domainToSources.get(domain) || [];
            await prisma.aggregationHost.create({
              data: {
                aggregationResultId: aggregationResult.id,
                hostEntryId: hostEntry.id,
                sourceIds: JSON.stringify(sourceIds),
                primarySourceId: sourceIds[0] || ''
              }
            });
          }
        } catch (error) {
          logger.warn(`Could not create aggregation host record for ${domain}:`, error);
        }
      }

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
      // Try to get cached content first from database
      const cachedContent = await this.getCachedContent(source.id);
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

      // Cache the content in database
      await this.cacheSourceContent(source.id, content);

      return content;
    } else if (source.type === 'FILE' && source.filePath) {
      return await this.getCachedContent(source.id) || '';
    } else {
      throw new Error(`Invalid source type or missing URL/filePath for source ${source.id}`);
    }
  }

  /**
   * Detects the format of hosts file content with confidence scoring.
   * 
   * @param content - The content to analyze
   * @param manualFormat - Optional manual format override ('standard', 'adblock', or 'auto')
   * @param confidenceThreshold - Minimum confidence threshold (0-100) to auto-detect format
   * @returns Object containing detected format, confidence score, and whether manual override was used
   */
  private detectFormat(
    content: string,
    manualFormat?: 'standard' | 'adblock' | 'auto',
    confidenceThreshold: number = 60
  ): {
    format: 'standard' | 'adblock' | 'auto';
    confidence: number;
    manualOverride: boolean;
    detectedFormat: 'standard' | 'adblock' | 'auto';
  } {
    const lines = content.split('\n').slice(0, 100); // Check first 100 lines
    
    let adblockPatternCount = 0;
    let standardPatternCount = 0;
    let totalPatternLines = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Check for AdBlock patterns: ||domain^
      if (trimmedLine.match(/\|\|[^\/\s]+\^/)) {
        adblockPatternCount++;
        totalPatternLines++;
      }
      
      // Check for standard hosts patterns: 0.0.0.0 domain or 127.0.0.1 domain
      if (trimmedLine.match(/^(0\.0\.0\.0|127\.0\.0\.1)\s+/)) {
        standardPatternCount++;
        totalPatternLines++;
      }
    }
    
    // Calculate confidence scores
    let adblockConfidence = 0;
    let standardConfidence = 0;
    
    if (totalPatternLines > 0) {
      adblockConfidence = (adblockPatternCount / totalPatternLines) * 100;
      standardConfidence = (standardPatternCount / totalPatternLines) * 100;
    }
    
    // Determine detected format based on confidence
    let detectedFormat: 'standard' | 'adblock' | 'auto' = 'auto';
    let confidence = 0;
    
    if (adblockConfidence > standardConfidence) {
      detectedFormat = 'adblock';
      confidence = adblockConfidence;
    } else if (standardConfidence > adblockConfidence) {
      detectedFormat = 'standard';
      confidence = standardConfidence;
    } else {
      detectedFormat = 'auto';
      confidence = 0;
    }
    
    // Check for mixed content (both formats present with similar percentages)
    const mixedContentThreshold = 10; // Both formats present with at least 10%
    if (adblockPatternCount > 0 && standardPatternCount > 0) {
      const difference = Math.abs(adblockConfidence - standardConfidence);
      if (difference < mixedContentThreshold) {
        logger.warn(
          `Mixed content detected: ${adblockPatternCount} AdBlock patterns, ${standardPatternCount} standard patterns. ` +
          `Confidence: AdBlock ${adblockConfidence.toFixed(1)}%, Standard ${standardConfidence.toFixed(1)}%`
        );
      }
    }
    
    // Apply manual format override if provided and not 'auto'
    if (manualFormat && manualFormat !== 'auto') {
      logger.info(`Using manual format override: ${manualFormat} (detected: ${detectedFormat}, confidence: ${confidence.toFixed(1)}%)`);
      return {
        format: manualFormat,
        confidence,
        manualOverride: true,
        detectedFormat
      };
    }
    
    // Use auto-detection if confidence is below threshold
    if (confidence < confidenceThreshold) {
      logger.info(
        `Low confidence detection (${confidence.toFixed(1)}% < ${confidenceThreshold}%), using 'auto' format. ` +
        `Detected: ${detectedFormat}`
      );
      return {
        format: 'auto',
        confidence,
        manualOverride: false,
        detectedFormat
      };
    }
    
    return {
      format: detectedFormat,
      confidence,
      manualOverride: false,
      detectedFormat
    };
  }

  private async getCachedContent(sourceId: string): Promise<string | null> {
    const contentRecord = await prisma.sourceContent.findUnique({
      where: { sourceId }
    });
    return contentRecord?.content || null;
  }

  private async cacheSourceContent(sourceId: string, content: string): Promise<void> {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const lineCount = content.split('\n').length;

    // Check if content has changed
    const existing = await prisma.sourceContent.findUnique({
      where: { sourceId }
    });

    const hasChanged = !existing || existing.contentHash !== contentHash;

    await prisma.sourceContent.upsert({
      where: { sourceId },
      update: {
        content,
        contentHash,
        lineCount,
        entryCount: 0, // Will be updated after parsing
        updatedAt: new Date()
      },
      create: {
        sourceId,
        content,
        contentHash,
        lineCount,
        entryCount: 0
      }
    });

    // Update the fetch log to indicate content change
    if (hasChanged && existing) {
      logger.info(`Content changed for source ${sourceId}`);
    }
  }

  /**
   * Stores the detected format information in the SourceContent table.
   * 
   * @param sourceId - The source ID
   * @param formatDetection - The format detection result
   */
  private async storeDetectedFormat(
    sourceId: string,
    formatDetection: {
      format: 'standard' | 'adblock' | 'auto';
      confidence: number;
      manualOverride: boolean;
      detectedFormat: 'standard' | 'adblock' | 'auto';
    }
  ): Promise<void> {
    try {
      await prisma.sourceContent.update({
        where: { sourceId },
        data: {
          format: formatDetection.format
        }
      });

      // Log format detection details
      logger.info(
        `Format detection for source ${sourceId}: ` +
        `format=${formatDetection.format}, ` +
        `confidence=${formatDetection.confidence.toFixed(1)}%, ` +
        `manualOverride=${formatDetection.manualOverride}, ` +
        `detected=${formatDetection.detectedFormat}`
      );
    } catch (error) {
      // Log but don't fail - content might not exist yet
      logger.warn(`Could not store detected format for source ${sourceId}:`, error);
    }
  }

  private async storeSourceEntries(sourceId: string, entries: ParsedEntry[]): Promise<void> {
    // Check if source still exists (safety check to avoid foreign key violations)
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true }
    });

    if (!source) {
      logger.warn(`Source ${sourceId} not found, skipping entries`);
      return;
    }

    // Update entry count in source content
    await prisma.sourceContent.updateMany({
      where: { sourceId },
      data: { entryCount: entries.length }
    });

    // Process each entry directly with sourceId on HostEntry
    for (const entry of entries) {
      const normalized = entry.domain.toLowerCase().trim();

      try {
        // Upsert host entry using composite unique constraint: domain + sourceId
        // Note: normalized is not updated on upsert to avoid P2002 violations when
        // multiple sources share the same domain (same normalized value)
        await prisma.hostEntry.upsert({
          where: {
            domain_sourceId: {
              domain: entry.domain,
              sourceId
            }
          },
          update: {
            entryType: entry.type,
            lastSeen: new Date(),
            occurrenceCount: { increment: 1 }
          },
          create: {
            domain: entry.domain,
            normalized,
            entryType: entry.type,
            sourceId,
            firstSeen: new Date(),
            lastSeen: new Date(),
            occurrenceCount: 1
          }
        });
      } catch (error) {
        // Log but don't fail - source might have been deleted during processing
        logger.warn(`Could not store entry for domain ${entry.domain}:`, error);
      }
    }

    logger.info(`Stored ${entries.length} entries for source ${sourceId}`);
  }

  private async logSourceFetch(
    sourceId: string,
    status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'NOT_MODIFIED',
    httpStatus: number | null,
    errorMessage: string | null,
    responseTimeMs: number,
    entryCount: number
  ): Promise<void> {
    try {
      await prisma.sourceFetchLog.create({
        data: {
          sourceId,
          status,
          httpStatus,
          errorMessage,
          responseTimeMs,
          contentChanged: false // Will be updated if content changes
        }
      });
    } catch (error) {
      // Source might have been deleted, log but don't throw
      logger.warn(`Could not log fetch for source ${sourceId}:`, error);
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
        allowed.add(entry.domain.toLowerCase());
      }
    }

    // Second pass: collect block rules (excluding allowed domains)
    for (const entry of entries) {
      if (entry.type === 'block' && !allowed.has(entry.domain.toLowerCase())) {
        blocked.add(entry.domain.toLowerCase());
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
        orderBy: { timestamp: 'desc' },
        include: {
          sources: {
            include: {
              source: {
                select: {
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              hosts: true
            }
          }
        }
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

      // Count unique host entries
      const totalEntries = await prisma.hostEntry.count();

      const latestAggregation = await this.getLatestAggregation();

      return {
        totalSources,
        enabledSources,
        totalEntries,
        lastAggregation: latestAggregation?.timestamp || null
      };
    } catch (error) {
      logger.error('Failed to get aggregation stats:', error);
      throw error;
    }
  }
}
