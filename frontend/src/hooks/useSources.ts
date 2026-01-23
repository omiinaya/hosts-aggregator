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
    mutationFn: async (source: CreateSourceRequest): Promise<Source> => {
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
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Source created successfully')
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Source updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
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