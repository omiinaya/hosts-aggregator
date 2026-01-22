export interface Source {
  id: string
  name: string
  url: string
  enabled: boolean
  lastChecked?: string
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