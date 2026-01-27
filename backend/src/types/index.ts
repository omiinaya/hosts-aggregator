// ============================================================================
// Hosts-Aggregator Types
// ============================================================================
// These types reflect the database-first schema with proper relationships
// between sources, host entries, and aggregation results.
// ============================================================================

// ============================================================================
// Source Types
// ============================================================================

export interface HostsSource {
  id: string;
  name: string;
  url: string | null;
  filePath: string | null;
  type: 'URL' | 'FILE';
  enabled: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSourceRequest {
  name: string;
  url: string;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateSourceRequest {
  name?: string;
  url?: string;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// Host Entry Types
// ============================================================================

export interface HostEntry {
  id: string;
  domain: string;
  normalized: string;
  entryType: 'block' | 'allow' | 'element';
  firstSeen: Date;
  lastSeen: Date;
  occurrenceCount: number;
}

export interface SourceHostMapping {
  id: string;
  sourceId: string;
  hostEntryId: string;
  lineNumber: number | null;
  rawLine: string | null;
  comment: string | null;
  firstSeen: Date;
  lastSeen: Date;
}

// ============================================================================
// Source Content Types (replaces file-based caching)
// ============================================================================

export interface SourceContent {
  id: string;
  sourceId: string;
  content: string;
  contentHash: string;
  lineCount: number;
  entryCount: number;
  fetchedAt: Date;
  updatedAt: Date;
}

export interface SourceFetchLog {
  id: string;
  sourceId: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'NOT_MODIFIED';
  httpStatus: number | null;
  errorMessage: string | null;
  responseTimeMs: number | null;
  contentChanged: boolean;
  contentId: string | null;
  fetchedAt: Date;
}

// ============================================================================
// Aggregation Types
// ============================================================================

export interface AggregationResult {
  id: string;
  timestamp: Date;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  allowEntries: number;
  blockEntries: number;
  processingTimeMs: number;
  triggeredBy: 'manual' | 'scheduled' | 'auto' | 'webhook';
  filePath: string;
  fileSizeBytes: number | null;
  fileHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AggregationSource {
  id: string;
  aggregationResultId: string;
  sourceId: string;
  entriesContributed: number;
  uniqueDomainsContributed: number;
  fetchStatus: 'SUCCESS' | 'ERROR' | 'CACHED' | 'SKIPPED';
  fetchDurationMs: number | null;
}

export interface AggregationHost {
  id: string;
  aggregationResultId: string;
  hostEntryId: string;
  sourceIds: string[];
  primarySourceId: string;
}

export interface AggregationStats {
  totalSources: number;
  totalEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  processingTime: number;
  blockedDomains: string[];
  allowedDomains: string[];
}

// ============================================================================
// Parser Types
// ============================================================================

export interface ParsedEntry {
  domain: string;
  source: string;
  type: 'block' | 'allow' | 'element';
  comment?: string;
  lineNumber: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SourceWithHostCount extends HostsSource {
  hostCount: number;
}

export interface SourceWithContent extends HostsSource {
  content: SourceContent | null;
  fetchLogs: SourceFetchLog[];
}

export interface AggregationWithDetails extends AggregationResult {
  sources: AggregationSource[];
  hosts: AggregationHost[];
}
