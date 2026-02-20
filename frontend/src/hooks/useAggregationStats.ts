import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface AggregationStats {
  totalSources: number
  enabledSources: number
  totalEntries: number
  lastAggregation: string | null
}

export interface AggregationResult {
  id: string
  timestamp: string
  totalSources: number
  successfulSources: number
  failedSources: number
  totalEntries: number
  uniqueEntries: number
  duplicatesRemoved: number
  allowEntries: number
  blockEntries: number
  processingTimeMs: number
  triggeredBy: string
  sources: Array<{
    id: string
    sourceId: string
    entriesContributed: number
    fetchStatus: 'SUCCESS' | 'ERROR' | 'CACHED' | 'SKIPPED'
    fetchDurationMs: number
    source: {
      name: string
    }
  }>
  _count: {
    hosts: number
  }
}

export interface AggregationStatus {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  totalSources: number
  processedSources: number
  currentSource?: string
  error?: string
}

// Fetch aggregation statistics
export const useAggregationStats = () => {
  return useQuery({
    queryKey: ['aggregation', 'stats'],
    queryFn: async (): Promise<AggregationStats> => {
      const response = await fetch(`${API_BASE_URL}/aggregate/stats`)
      if (!response.ok) {
        throw new Error('Failed to fetch aggregation stats')
      }
      const data = await response.json()
      return data.data
    },
  })
}

// Fetch aggregation history
export const useAggregationHistory = () => {
  return useQuery({
    queryKey: ['aggregation', 'history'],
    queryFn: async (): Promise<AggregationResult[]> => {
      const response = await fetch(`${API_BASE_URL}/aggregate/history`)
      if (!response.ok) {
        throw new Error('Failed to fetch aggregation history')
      }
      const data = await response.json()
      return data.data
    },
  })
}

// Fetch current aggregation status
export const useAggregationStatus = () => {
  return useQuery({
    queryKey: ['aggregation', 'status'],
    queryFn: async (): Promise<AggregationStatus> => {
      const response = await fetch(`${API_BASE_URL}/aggregate/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch aggregation status')
      }
      const data = await response.json()
      return data.data
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })
}

// Trigger aggregation
export const useAggregate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<AggregationResult> => {
      const response = await fetch(`${API_BASE_URL}/aggregate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to trigger aggregation')
      }

      const data = await response.json()
      return data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aggregation'] })
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success(`Aggregation completed successfully! Processed ${data.uniqueEntries} unique entries.`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Fetch latest aggregation result
export const useLatestAggregation = () => {
  return useQuery({
    queryKey: ['aggregation', 'latest'],
    queryFn: async (): Promise<AggregationResult | null> => {
      const response = await fetch(`${API_BASE_URL}/aggregate`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to fetch latest aggregation')
      }
      const data = await response.json()
      return data.data
    },
  })
}
