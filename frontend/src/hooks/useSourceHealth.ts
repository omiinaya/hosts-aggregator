import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface SourceHealth {
  id: string
  sourceId: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastChecked: string
  responseTime: number
  errorMessage?: string
  consecutiveFailures: number
  contentChanged: boolean
}

export interface SourceHealthReport {
  totalSources: number
  healthySources: number
  unhealthySources: number
  unknownSources: number
  sources: SourceHealth[]
}

export interface SourceFetchLog {
  id: string
  sourceId: string
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'NOT_MODIFIED'
  httpStatus: number | null
  errorMessage: string | null
  responseTimeMs: number
  contentChanged: boolean
  createdAt: string
}

// Fetch health status for all sources
export const useSourceHealth = () => {
  return useQuery({
    queryKey: ['sources', 'health'],
    queryFn: async (): Promise<SourceHealthReport> => {
      const response = await fetch(`${API_BASE_URL}/sources/health`)
      if (!response.ok) {
        throw new Error('Failed to fetch source health')
      }
      const data = await response.json()
      return data.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Fetch health status for a specific source
export const useSourceHealthById = (sourceId: string) => {
  return useQuery({
    queryKey: ['sources', 'health', sourceId],
    queryFn: async (): Promise<SourceHealth> => {
      const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/health`)
      if (!response.ok) {
        throw new Error('Failed to fetch source health')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!sourceId,
    refetchInterval: 30000,
  })
}

// Fetch detailed health report
export const useSourceHealthReport = () => {
  return useQuery({
    queryKey: ['sources', 'health-report'],
    queryFn: async (): Promise<SourceHealthReport> => {
      const response = await fetch(`${API_BASE_URL}/sources/health/report`)
      if (!response.ok) {
        throw new Error('Failed to fetch source health report')
      }
      const data = await response.json()
      return data.data
    },
  })
}

// Fetch fetch logs for a specific source
export const useSourceFetchLogs = (sourceId: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['sources', 'fetch-logs', sourceId, limit],
    queryFn: async (): Promise<SourceFetchLog[]> => {
      const response = await fetch(
        `${API_BASE_URL}/sources/${sourceId}/logs?limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch source logs')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!sourceId,
  })
}

// Check health for a specific source
export const useCheckSourceHealth = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sourceId: string): Promise<SourceHealth> => {
      const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check source health')
      }

      const data = await response.json()
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', 'health'] })
      toast.success('Source health check completed')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Check health for all sources
export const useCheckAllSourcesHealth = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<SourceHealthReport> => {
      const response = await fetch(`${API_BASE_URL}/sources/health/check-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check sources health')
      }

      const data = await response.json()
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', 'health'] })
      toast.success('All sources health check completed')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
