export interface HostsSource {
  id: string;
  name: string;
  url: string | null;
  filePath: string | null;
  type: 'URL' | 'FILE';
  enabled: boolean;
  lastFetched: Date | null;
  lastFetchStatus: 'SUCCESS' | 'ERROR' | 'PENDING' | null;
  entryCount: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSourceRequest {
  name: string;
  url?: string;
  filePath?: string;
  type: 'URL' | 'FILE';
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateSourceRequest {
  name?: string;
  url?: string;
  filePath?: string;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface AggregationResult {
  id: string;
  timestamp: Date;
  totalSources: number;
  totalEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  filePath: string;
  sourcesUsed: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedEntry {
  domain: string;
  source: string;
  type: 'block' | 'allow' | 'element';
  comment?: string;
  lineNumber: number;
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