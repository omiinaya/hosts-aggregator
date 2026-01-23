import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AggregationStatus, UnifiedHostsFile } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Start aggregation
export const useStartAggregation = () => {
  return useMutation({
    mutationFn: async (): Promise<AggregationStatus> => {
      const response = await fetch(`${API_BASE_URL}/aggregate`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to start aggregation')
      }
      
      const data = await response.json()
      return data.data
    },
    onSuccess: () => {
      toast.success('Aggregation started successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Get aggregation status
export const useAggregationStatus = () => {
  return useQuery({
    queryKey: ['aggregation-status'],
    queryFn: async (): Promise<AggregationStatus> => {
      const response = await fetch(`${API_BASE_URL}/aggregate/status`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch aggregation status')
      }
      
      const data = await response.json()
      return data.data
    },
    refetchInterval: (query) => {
      const data = query.state.data as AggregationStatus
      return data?.status === 'running' ? 1000 : false
    },
  })
}

// Get latest unified hosts file
export const useLatestHostsFile = () => {
  return useQuery({
    queryKey: ['latest-hosts-file'],
    queryFn: async (): Promise<UnifiedHostsFile | null> => {
      const response = await fetch(`${API_BASE_URL}/aggregate/latest`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to fetch latest hosts file')
      }
      
      const data = await response.json()
      return data.data
    },
  })
}