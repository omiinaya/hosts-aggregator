export interface Source {
  id: string
  name: string
  url: string
  enabled: boolean
  lastChecked?: string
  hostCount?: number
  lastFetchStatus?: 'SUCCESS' | 'ERROR'
  createdAt: string
  updatedAt: string
}

export interface AggregationStatus {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  totalSources: number
  processedSources: number
  currentSource?: string
  error?: string
}

export interface UnifiedHostsFile {
  id: string
  filename: string
  size: number
  createdAt: string
  totalEntries: number
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface CreateSourceRequest {
  name: string
  url: string
  enabled?: boolean
}

export interface UpdateSourceRequest {
  name?: string
  url?: string
  enabled?: boolean
}

export interface HostEntry {
  id: string
  domain: string
  normalized: string
  entryType: 'block' | 'allow' | 'element'
  enabled: boolean
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  sourceId: string | null  // NEW: optional source tracking
  source?: HostSource | null  // NEW: optional source relation
  sources: HostSource[]  // Kept for backward compatibility with API response
}

export interface HostSource {
  id: string
  name: string
  type?: string
  enabled: boolean
  mappingEnabled?: boolean
  lineNumber?: number
  rawLine?: string
  comment?: string
}

export interface HostListResponse {
  hosts: HostEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface HostStats {
  total: number
  enabled: number
  disabled: number
  byEntryType: {
    block: number
    allow: number
    element: number
  }
  bySource: Array<{
    sourceId: string
    sourceName: string
    hostCount: number
  }>
}

export interface HostListParams {
  page?: number
  limit?: number
  enabled?: boolean
  entryType?: 'block' | 'allow' | 'element'
  search?: string
  sourceId?: string
}

export interface BulkUpdateHostsRequest {
  hostIds: string[]
  enabled: boolean
}

export interface BulkToggleHostsRequest {
  hostIds: string[]
}

export interface UpdateHostRequest {
  enabled?: boolean
}

export interface ToggleSourceHostMappingRequest {
  enabled: boolean
}

export interface BulkUpdateSourceHostMappingsRequest {
  sourceIds: string[]
  enabled: boolean
}