import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Source, CreateSourceRequest, UpdateSourceRequest } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Fetch all sources
export const useSources = () => {
  return useQuery({
    queryKey: ['sources'],
    queryFn: async (): Promise<Source[]> => {
      const response = await fetch(`${API_BASE_URL}/sources`)
      if (!response.ok) {
        throw new Error('Failed to fetch sources')
      }
      const data = await response.json()
      return data.data
    },
  })
}

// Create a new source
export const useCreateSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (source: CreateSourceRequest): Promise<{ source: Source; aggregation?: { success: boolean; error?: string; entriesProcessed?: number } }> => {
      const response = await fetch(`${API_BASE_URL}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(source),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create source')
      }
      
      const data = await response.json()
      return {
        source: data.data,
        aggregation: data.aggregation
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      
      if (data.aggregation) {
        if (data.aggregation.success) {
          toast.success(`Source created successfully. ${data.aggregation.entriesProcessed || 0} hosts aggregated.`)
        } else {
          toast.error(data.aggregation.error || 'Source created but aggregation failed')
        }
      } else {
        toast.success('Source created successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Update a source
export const useUpdateSource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSourceRequest & { id: string }): Promise<Source> => {
      const response = await fetch(`${API_BASE_URL}/sources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update source')
      }

      const data = await response.json()
      return data.data
    },
    onMutate: async ({ id, ...updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sources'] })

      // Snapshot the previous value
      const previousSources = queryClient.getQueryData<Source[]>(['sources'])

      // Optimistically update to the new value
      if (previousSources) {
        queryClient.setQueryData<Source[]>(['sources'], old => {
          if (!old) return old
          return old.map(source =>
            source.id === id ? { ...source, ...updates } : source
          )
        })
      }

      return { previousSources }
    },
    onError: (error: Error, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousSources) {
        queryClient.setQueryData(['sources'], context.previousSources)
      }
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Source updated successfully')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}

// Delete a source
export const useDeleteSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/sources/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete source')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Source deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Refresh a specific source to gather all hosts from it
export const useRefreshSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/sources/${id}/refresh`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to refresh source')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
      toast.success('Source refreshed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}