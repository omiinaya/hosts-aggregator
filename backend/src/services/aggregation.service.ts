import axios from 'axios';
import crypto from 'crypto';
import { HostsParser } from './parser.service';
import { prisma } from '../config/database';
import { AggregationStats, ParsedEntry } from '../types';
import { logger } from '../utils/logger';

export interface AggregationProgress {
  totalSources: number;
  processedSources: number;
  currentSourceId: string | null;
  status: 'idle' | 'running' | 'completed' | 'error';
  entriesProcessed: number;
}

export class AggregationService {
  private parser: HostsParser;
  private progress: {
    totalSources: number;
    processedSources: number;
    currentSourceId: string | null;
    status: 'idle' | 'running' | 'completed' | 'error';
    entriesProcessed: number;
  };

  constructor() {
    this.parser = new HostsParser();
    this.progress = {
      totalSources: 0,
      processedSources: 0,
      currentSourceId: null,
      status: 'idle',
      entriesProcessed: 0,
    };
  }

  async aggregateSources(): Promise<AggregationStats> {
    const startTime = Date.now();

    try {
      // Get all enabled sources
      const sources = await prisma.source.findMany({
        where: { enabled: true },
      });

      if (sources.length === 0) {
        this.progress = {
          totalSources: 0,
          processedSources: 0,
          currentSourceId: null,
          status: 'completed',
          entriesProcessed: 0,
        };
        return {
          totalSources: 0,
          totalEntries: 0,
          uniqueEntries: 0,
          duplicatesRemoved: 0,
          processingTime: Date.now() - startTime,
          blockedDomains: [],
          allowedDomains: [],
        };
      }

      // Initialize progress
      this.progress = {
        totalSources: sources.length,
        processedSources: 0,
        currentSourceId: null,
        status: 'running',
        entriesProcessed: 0,
      };

      const allEntries: ParsedEntry[] = [];
      const processedSources: string[] = [];
      const sourceStats: Map<string, { entries: number; duration: number; status: string }> =
        new Map();

      // Process all sources in parallel
      const processingPromises = sources.map(async (source) => {
        this.progress.currentSourceId = source.id;
        const sourceStartTime = Date.now();
        try {
          // Verify source still exists before processing
          const sourceExists = await prisma.source.findUnique({
            where: { id: source.id },
            select: { id: true },
          });

          if (!sourceExists) {
            logger.warn(`Source ${source.id} no longer exists, skipping`);
            return null;
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

          const duration = Date.now() - sourceStartTime;
          sourceStats.set(source.id, { entries: entries.length, duration, status: 'SUCCESS' });

          // Log successful fetch
          await this.logSourceFetch(source.id, 'SUCCESS', 200, null, duration, entries.length);

          this.progress.processedSources++;
          return { sourceId: source.id, entries };
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

          this.progress.processedSources++;
          return null;
        }
      });

      const processingResults = await Promise.all(processingPromises);

      // All sources processed, mark as completed
      this.progress.status = 'completed';
      this.progress.currentSourceId = null;

      // Collect results from successful sources
      for (const result of processingResults) {
        if (result) {
          // Push entries one by one to avoid stack overflow with large arrays
          for (const entry of result.entries) {
            allEntries.push(entry);
          }
          processedSources.push(result.sourceId);
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
          triggeredBy: 'manual',
        },
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
              fetchDurationMs: stats.duration,
            },
          });
        } catch (error) {
          logger.warn(`Could not create aggregation source record for ${sourceId}:`, error);
        }
      }

      // Build domain -> sources map from allEntries
      const domainToSources = new Map<string, string[]>();
      for (const entry of allEntries) {
        if (entry.type === 'block') {
          const normalized = entry.domain.toLowerCase();
          if (!domainToSources.has(normalized)) {
            domainToSources.set(normalized, []);
          }
          const srcs = domainToSources.get(normalized)!;
          if (!srcs.includes(entry.source)) {
            srcs.push(entry.source);
          }
        }
      }

      // Get all unique blocked domains (normalized)
      const allDomains = Array.from(domainToSources.keys());

      // Ensure all host entries exist (batch upsert)
      const existingHostEntries = await prisma.hostEntry.findMany({
        where: { normalized: { in: allDomains } },
        select: { id: true, normalized: true },
      });
      const hostEntryMap = new Map(existingHostEntries.map((e) => [e.normalized, e.id]));

      // Create missing host entries in a transaction
      const missingDomains = allDomains.filter((d) => !hostEntryMap.has(d));
      if (missingDomains.length > 0) {
        const createdEntries = await prisma.$transaction(
          missingDomains.map((domain) =>
            prisma.hostEntry.create({
              data: {
                domain: domain,
                normalized: domain,
                entryType: 'block',
                enabled: true,
                occurrenceCount: 0,
              },
            })
          )
        );
        for (const entry of createdEntries) {
          hostEntryMap.set(entry.normalized, entry.id);
        }
      }

      // Prepare aggregation hosts and their source links
      const hostsToCreate: {
        aggregationResultId: string;
        hostEntryId: string;
        primarySourceId: string;
      }[] = [];
      const hostSourcesToCreate: { aggregationHostId: string; sourceId: string }[] = [];

      // For each domain, create an aggregationHost and link to sources
      for (const [domain, sourceIds] of domainToSources) {
        const hostEntryId = hostEntryMap.get(domain)!;
        const uniqueSourceIds = [...new Set(sourceIds)];
        hostsToCreate.push({
          aggregationResultId: aggregationResult.id,
          hostEntryId,
          primarySourceId: uniqueSourceIds[0],
        });
      }

      // Bulk create aggregation hosts
      if (hostsToCreate.length > 0) {
        await prisma.aggregationHost.createMany({
          data: hostsToCreate,
        });
      }

      // Now we need to get the IDs of the hosts we just created to link sources
      const createdAggHosts = await prisma.aggregationHost.findMany({
        where: {
          aggregationResultId: aggregationResult.id,
          hostEntryId: { in: hostsToCreate.map((h) => h.hostEntryId) },
        },
      });

      const hostIdToAggHostId = new Map<string, string>();
      for (const host of createdAggHosts) {
        hostIdToAggHostId.set(host.hostEntryId, host.id);
      }

      // Build AggregationHostSource links
      for (const [domain, sourceIds] of domainToSources) {
        const hostEntryId = hostEntryMap.get(domain)!;
        const aggregationHostId = hostIdToAggHostId.get(hostEntryId);
        if (!aggregationHostId) continue;

        for (const sourceId of [...new Set(sourceIds)]) {
          hostSourcesToCreate.push({
            aggregationHostId,
            sourceId,
          });
        }
      }

      // Bulk insert source links (deduplicate to avoid unique constraint violations)
      if (hostSourcesToCreate.length > 0) {
        // Deduplicate by combination of aggregationHostId and sourceId
        const uniqueLinks = Array.from(
          new Map(
            hostSourcesToCreate.map((link) => [`${link.aggregationHostId}|${link.sourceId}`, link])
          ).values()
        );
        await prisma.aggregationHostSource.createMany({
          data: uniqueLinks,
        });
      }

      return {
        totalSources: processedSources.length,
        totalEntries: allEntries.length,
        uniqueEntries: result.blockedDomains.length,
        duplicatesRemoved: allEntries.length - result.blockedDomains.length,
        processingTime: Date.now() - startTime,
        blockedDomains: result.blockedDomains,
        allowedDomains: result.allowedDomains,
      };
    } catch (error) {
      this.progress.status = 'error';
      logger.error('Aggregation failed:', error);
      throw error;
    }
  }

  getProgress() {
    return { ...this.progress };
  }

  public updateProgress(updates: Partial<AggregationProgress>): void {
    this.progress = { ...this.progress, ...updates };
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
          'User-Agent': 'Hosts-Aggregator/1.0',
        },
      });

      const content = response.data;

      // Cache the content in database
      await this.cacheSourceContent(source.id, content);

      return content;
    } else if (source.type === 'FILE' && source.filePath) {
      return (await this.getCachedContent(source.id)) || '';
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
      if (trimmedLine.match(/\|\|[^/s]+\^/)) {
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
      logger.info(
        `Using manual format override: ${manualFormat} (detected: ${detectedFormat}, confidence: ${confidence.toFixed(1)}%)`
      );
      return {
        format: manualFormat,
        confidence,
        manualOverride: true,
        detectedFormat,
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
        detectedFormat,
      };
    }

    return {
      format: detectedFormat,
      confidence,
      manualOverride: false,
      detectedFormat,
    };
  }

  private async getCachedContent(sourceId: string): Promise<string | null> {
    const contentRecord = await prisma.sourceContent.findUnique({
      where: { sourceId },
    });
    return contentRecord?.content || null;
  }

  private async cacheSourceContent(sourceId: string, content: string): Promise<void> {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const lineCount = content.split('\n').length;

    // Check if content has changed
    const existing = await prisma.sourceContent.findUnique({
      where: { sourceId },
    });

    const hasChanged = !existing || existing.contentHash !== contentHash;

    await prisma.sourceContent.upsert({
      where: { sourceId },
      update: {
        content,
        contentHash,
        lineCount,
        entryCount: 0, // Will be updated after parsing
        updatedAt: new Date(),
      },
      create: {
        sourceId,
        content,
        contentHash,
        lineCount,
        entryCount: 0,
      },
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
          format: formatDetection.format,
        },
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
    // Update entry count in source content
    await prisma.sourceContent.updateMany({
      where: { sourceId },
      data: { entryCount: entries.length },
    });

    if (entries.length === 0) {
      return;
    }

    // Process entries in high-performance batches with bulk SQL
    const BATCH_SIZE = 500; // Reduced to respect SQLite parameter limits
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
    let totalStored = 0;
    let failedBatches = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        // Group entries by (domain, entryType) to count duplicates
        const groupMap = new Map<
          string,
          {
            domain: string;
            normalized: string;
            entryType: string;
            count: number;
          }
        >();

        for (const entry of batch) {
          const key = `${entry.domain}|${entry.type}`;
          const existing = groupMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            groupMap.set(key, {
              domain: entry.domain,
              normalized: entry.domain.toLowerCase().trim(),
              entryType: entry.type,
              count: 1,
            });
          }
        }

        const groups = Array.from(groupMap.values());
        if (groups.length === 0) {
          continue;
        }

        // Build and execute bulk INSERT ... ON CONFLICT DO UPDATE in chunks
        // to avoid exceeding SQLite's parameter limit (max 999 by default)
        const GROUP_CHUNK_SIZE = 140; // 140 groups * 8 params = 1120; we need to stay under 999, so use 120
        const safeChunkSize = Math.min(GROUP_CHUNK_SIZE, Math.floor(999 / 8));
        const now = new Date();

        for (let j = 0; j < groups.length; j += safeChunkSize) {
          const chunk = groups.slice(j, j + safeChunkSize);
          const placeholders: string[] = [];
          const chunkParams: any[] = [];

          for (const group of chunk) {
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
            chunkParams.push(
              crypto.randomUUID(), // Generate unique ID for new rows
              group.domain,
              group.normalized,
              group.entryType,
              sourceId,
              now,
              now,
              group.count
            );
          }

          const sql = `
            INSERT INTO host_entries (id, domain, normalized, entryType, sourceId, firstSeen, lastSeen, occurrenceCount)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT(domain, sourceId) DO UPDATE SET
              entryType = excluded.entryType,
              lastSeen = excluded.lastSeen,
              occurrenceCount = host_entries.occurrenceCount + excluded.occurrenceCount
          `;

          await prisma.$executeRawUnsafe(sql, ...chunkParams);
        }

        totalStored += batch.length;
        this.progress.entriesProcessed += batch.length;
        if (totalBatches > 1) {
          logger.debug(
            `Processed batch ${batchNumber}/${totalBatches} (${batch.length} entries, ${groups.length} distinct) for source ${sourceId}`
          );
        }
      } catch (error) {
        failedBatches++;
        logger.error(
          `Failed to process batch ${batchNumber}/${totalBatches} for source ${sourceId}:`,
          error
        );
        // Continue with next batch even if this one fails
      }
    }

    if (failedBatches > 0) {
      logger.warn(
        `Source ${sourceId}: Stored ${totalStored}/${entries.length} entries ` +
          `(${failedBatches}/${totalBatches} batches failed)`
      );
    } else {
      logger.info(
        `Stored ${totalStored} entries (${totalStored} batches completed) for source ${sourceId}`
      );
    }
  }

  private async logSourceFetch(
    sourceId: string,
    status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'NOT_MODIFIED',
    httpStatus: number | null,
    errorMessage: string | null,
    responseTimeMs: number,
    _entryCount: number
  ): Promise<void> {
    try {
      await prisma.sourceFetchLog.create({
        data: {
          sourceId,
          status,
          httpStatus,
          errorMessage,
          responseTimeMs,
          contentChanged: false, // Will be updated if content changes
        },
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
      allowedDomains: Array.from(allowed).sort(),
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
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              hosts: true,
            },
          },
        },
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
        where: { enabled: true },
      });

      // Count unique host entries
      const totalEntries = await prisma.hostEntry.count();

      const latestAggregation = await this.getLatestAggregation();

      return {
        totalSources,
        enabledSources,
        totalEntries,
        lastAggregation: latestAggregation?.timestamp || null,
      };
    } catch (error) {
      logger.error('Failed to get aggregation stats:', error);
      throw error;
    }
  }

  /**
   * Process a single source and return detailed results.
   * This method is used for manual source refresh operations.
   *
   * @param source - The source to process
   * @returns Object containing processing results
   */
  async processSource(source: any): Promise<{
    success: boolean;
    entriesProcessed: number;
    contentChanged: boolean;
    format: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Fetch source content
      const content = await this.fetchSourceContent(source);

      // Detect format
      const formatDetection = this.detectFormat(
        content,
        source.format as 'standard' | 'adblock' | 'auto' | undefined
      );

      // Store detected format
      await this.storeDetectedFormat(source.id, formatDetection);

      // Parse content
      const entries = this.parser.parseContent(content, source.id, formatDetection.format);

      // Store entries
      await this.storeSourceEntries(source.id, entries);

      // Check if content changed
      const existingCache = await prisma.sourceContent.findUnique({
        where: { sourceId: source.id },
      });
      const contentChanged = existingCache?.content !== content;

      // Log successful fetch
      await this.logSourceFetch(
        source.id,
        'SUCCESS',
        200,
        null,
        Date.now() - startTime,
        entries.length
      );

      return {
        success: true,
        entriesProcessed: entries.length,
        contentChanged,
        format: formatDetection.format,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to process source ${source.id}:`, error);

      // Log failed fetch
      try {
        await this.logSourceFetch(
          source.id,
          'ERROR',
          null,
          errorMessage,
          Date.now() - startTime,
          0
        );
      } catch (logError) {
        logger.warn(`Could not log fetch error for source ${source.id}:`, logError);
      }

      return {
        success: false,
        entriesProcessed: 0,
        contentChanged: false,
        format: 'unknown',
        error: errorMessage,
      };
    }
  }

  private async getLatestAggregationResultId(): Promise<string | null> {
    const result = await prisma.aggregationResult.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { id: true },
    });
    return result?.id || null;
  }

  /**
   * Incrementally add a source to the aggregation tables.
   * Uses normalized many-to-many schema via AggregationHostSource.
   */
  async incrementalAddSource(
    sourceId: string
  ): Promise<{ success: boolean; entriesProcessed: number; error?: string }> {
    const startTime = Date.now();
    logger.info(`[TIMING] incrementalAddSource START for source ${sourceId}`);

    try {
      const source = await prisma.source.findUnique({
        where: { id: sourceId },
        include: { contentCache: true },
      });
      logger.info(`[TIMING] Fetch source: ${Date.now() - startTime}ms`);

      if (!source || !source.contentCache) {
        return {
          success: false,
          entriesProcessed: 0,
          error: 'Source not found or has no cached content',
        };
      }

      const format = source.format || 'auto';
      const entries = this.parser.parseContent(
        source.contentCache.content,
        sourceId,
        format as any
      );

      if (entries.length === 0) {
        return { success: true, entriesProcessed: 0 };
      }

      const latestAggregationResultId = await this.getLatestAggregationResultId();
      logger.info(`[TIMING] Get latest aggregation result ID: ${Date.now() - startTime}ms`);
      if (!latestAggregationResultId) {
        throw new Error('No aggregation result exists. Run full aggregation first.');
      }

      // Build normalized domain -> [sourceId] map
      const domainToSources = new Map<string, string[]>();
      for (const entry of entries) {
        if (entry.type === 'block') {
          const normalized = entry.domain.toLowerCase();
          if (!domainToSources.has(normalized)) {
            domainToSources.set(normalized, []);
          }
          domainToSources.get(normalized)!.push(sourceId);
        }
      }
      logger.info(
        `[TIMING] Built domain map (${entries.length} entries -> ${domainToSources.size} domains): ${Date.now() - startTime}ms`
      );

      const blockedDomains = Array.from(domainToSources.keys());

      // Ensure all host entries exist (batch upsert)
      const existingHostEntries = await prisma.hostEntry.findMany({
        where: { normalized: { in: blockedDomains } },
        select: { id: true, normalized: true },
      });
      logger.info(
        `[TIMING] Fetched existing host entries (${existingHostEntries.length} found): ${Date.now() - startTime}ms`
      );
      const hostEntryMap = new Map(existingHostEntries.map((e) => [e.normalized, e.id]));

      const missingDomains = blockedDomains.filter((d) => !hostEntryMap.has(d));
      if (missingDomains.length > 0) {
        const newEntries = await prisma.$transaction(
          missingDomains.map((domain) =>
            prisma.hostEntry.create({
              data: {
                domain,
                normalized: domain,
                entryType: 'block',
                enabled: true,
                occurrenceCount: 0,
              },
            })
          )
        );
        for (const entry of newEntries) {
          hostEntryMap.set(entry.normalized, entry.id);
        }
      }

      // Find existing aggregationHosts for these hostEntryIds
      const hostEntryIds = Array.from(hostEntryMap.values());
      const existingAggHosts = await prisma.aggregationHost.findMany({
        where: {
          aggregationResultId: latestAggregationResultId,
          hostEntryId: { in: hostEntryIds },
        },
      });

      const hostIdToAggHostId = new Map<string, string>();
      for (const host of existingAggHosts) {
        hostIdToAggHostId.set(host.hostEntryId, host.id);
      }

      // Prepare new aggregationHosts for domains without one
      const newAggHosts: {
        aggregationResultId: string;
        hostEntryId: string;
        primarySourceId: string;
      }[] = [];
      for (const domain of blockedDomains) {
        const hostEntryId = hostEntryMap.get(domain)!;
        if (!hostIdToAggHostId.has(hostEntryId)) {
          newAggHosts.push({
            aggregationResultId: latestAggregationResultId,
            hostEntryId,
            primarySourceId: sourceId,
          });
        }
      }

      if (newAggHosts.length > 0) {
        await prisma.aggregationHost.createMany({
          data: newAggHosts,
        });

        // Fetch IDs of newly created hosts
        const createdHosts = await prisma.aggregationHost.findMany({
          where: {
            aggregationResultId: latestAggregationResultId,
            hostEntryId: { in: newAggHosts.map((h) => h.hostEntryId) },
          },
        });
        for (const host of createdHosts) {
          hostIdToAggHostId.set(host.hostEntryId, host.id);
        }
      }

      // Build AggregationHostSource links for all domains
      const hostSourceLinks: { aggregationHostId: string; sourceId: string }[] = [];
      for (const domain of blockedDomains) {
        const hostEntryId = hostEntryMap.get(domain)!;
        const aggHostId = hostIdToAggHostId.get(hostEntryId);
        if (!aggHostId) continue;

        hostSourceLinks.push({
          aggregationHostId: aggHostId,
          sourceId,
        });
      }

      // Insert source links
      if (hostSourceLinks.length > 0) {
        // Deduplicate to avoid constraint violations
        const uniqueLinks = Array.from(
          new Map(
            hostSourceLinks.map((link) => [`${link.aggregationHostId}|${link.sourceId}`, link])
          ).values()
        );
        await prisma.aggregationHostSource.createMany({
          data: uniqueLinks,
        });
      }

      // Update source content cache entry count
      await prisma.sourceContent.update({
        where: { sourceId },
        data: { entryCount: entries.length },
      });

      logger.info(
        `Incremental add completed for source ${sourceId}: ${entries.length} entries in ${Date.now() - startTime}ms`
      );

      return { success: true, entriesProcessed: entries.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Incremental add failed for source ${sourceId}:`, error);
      return { success: false, entriesProcessed: 0, error: errorMessage };
    }
  }

  /**
   * Incrementally remove a source from the aggregation tables.
   * Uses normalized many-to-many schema.
   */
  async incrementalDeleteSource(
    sourceId: string
  ): Promise<{ success: boolean; entriesRemoved?: number; error?: string }> {
    const startTime = Date.now();

    try {
      const latestAggregationResultId = await this.getLatestAggregationResultId();
      if (!latestAggregationResultId) {
        return { success: true, entriesRemoved: 0 };
      }

      // Find all AggregationHostSource links for this source within latest aggregation
      const hostSourceLinks = await prisma.aggregationHostSource.findMany({
        where: {
          sourceId,
          aggregationHost: {
            aggregationResultId: latestAggregationResultId,
          },
        },
        select: { aggregationHostId: true },
      });

      if (hostSourceLinks.length === 0) {
        return { success: true, entriesRemoved: 0 };
      }

      const aggregationHostIds = hostSourceLinks.map((link) => link.aggregationHostId);

      // Delete the links
      await prisma.aggregationHostSource.deleteMany({
        where: {
          sourceId,
          aggregationHostId: { in: aggregationHostIds },
        },
      });

      // Check which aggregationHosts now have zero remaining links
      const hostsToCheck = await prisma.aggregationHost.findMany({
        where: { id: { in: aggregationHostIds } },
      });

      const hostsToDelete: string[] = [];
      for (const host of hostsToCheck) {
        const remaining = await prisma.aggregationHostSource.count({
          where: { aggregationHostId: host.id },
        });
        if (remaining === 0) {
          hostsToDelete.push(host.id);
        }
      }

      if (hostsToDelete.length > 0) {
        await prisma.aggregationHost.deleteMany({
          where: { id: { in: hostsToDelete } },
        });
      }

      const totalRemoved = hostsToDelete.length;
      logger.info(
        `Incremental delete completed for source ${sourceId}: removed ${totalRemoved} domain(s) in ${Date.now() - startTime}ms`
      );

      return { success: true, entriesRemoved: totalRemoved };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Incremental delete failed for source ${sourceId}:`, error);
      return { success: false, error: errorMessage };
    }
  }
}

export const aggregationService = new AggregationService();
