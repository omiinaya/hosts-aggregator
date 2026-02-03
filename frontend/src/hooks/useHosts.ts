import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  HostEntry,
  HostListResponse,
  HostStats,
  HostListParams,
  BulkUpdateHostsRequest,
  UpdateHostRequest,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Build query string from params
const buildQueryString = (params: HostListParams): string => {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.set('page', params.page.toString())
  if (params.limit) queryParams.set('limit', params.limit.toString())
  if (params.search) queryParams.set('search', params.search)
  if (params.enabled !== undefined) queryParams.set('enabled', params.enabled.toString())
  if (params.entryType) queryParams.set('entryType', params.entryType)
  if (params.sourceId) queryParams.set('sourceId', params.sourceId)
  
  return queryParams.toString()
}

// Fetch hosts with pagination, search, and filters
export const useHosts = (params: HostListParams = {}) => {
  return useQuery({
    queryKey: ['hosts', params],
    queryFn: async (): Promise<HostListResponse> => {
      const queryString = buildQueryString(params)
      const response = await fetch(`${API_BASE_URL}/hosts?${queryString}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch hosts')
      }
      
      const data = await response.json()
      return data.data
    },
  })
}

// Fetch host statistics
export const useHostStats = () => {
  return useQuery({
    queryKey: ['hosts', 'stats'],
    queryFn: async (): Promise<HostStats> => {
      const response = await fetch(`${API_BASE_URL}/hosts/stats`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch host stats')
      }
      
      const data = await response.json()
      return data.data
    },
  })
}

// Toggle single host enabled/disabled
export const useToggleHost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }): Promise<HostEntry> => {
      const response = await fetch(`${API_BASE_URL}/hosts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to toggle host')
      }
      
      const data = await response.json()
      return data.data
    },
    onMutate: async ({ id, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['hosts'] })
      
      // Snapshot the previous value
      const previousHosts = queryClient.getQueryData<HostListResponse>(['hosts'])
      
      // Optimistically update to the new value
      if (previousHosts) {
        queryClient.setQueryData<HostListResponse>(['hosts'], old => {
          if (!old) return old
          return {
            ...old,
            hosts: old.hosts.map(host =>
              host.id === id ? { ...host, enabled } : host
            ),
          }
        })
      }
      
      return { previousHosts }
    },
    onError: (error: Error, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousHosts) {
        queryClient.setQueryData(['hosts'], context.previousHosts)
      }
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Host toggled successfully')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      queryClient.invalidateQueries({ queryKey: ['hosts', 'stats'] })
    },
  })
}

// Bulk update hosts (enable/disable)
export const useBulkUpdateHosts = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (request: BulkUpdateHostsRequest): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/hosts/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to bulk update hosts')
      }
    },
    onSuccess: () => {
      toast.success('Hosts updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      queryClient.invalidateQueries({ queryKey: ['hosts', 'stats'] })
    },
  })
}

// Update single host
export const useUpdateHost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateHostRequest & { id: string }): Promise<HostEntry> => {
      const response = await fetch(`${API_BASE_URL}/hosts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update host')
      }
      
      const data = await response.json()
      return data.data
    },
    onSuccess: () => {
      toast.success('Host updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      queryClient.invalidateQueries({ queryKey: ['hosts', 'stats'] })
    },
  })
}
