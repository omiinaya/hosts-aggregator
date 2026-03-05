 import { useQuery } from '@tanstack/react-query'
 import { API_BASE_URL } from './useApiStatus'

 export interface AggregationProgress {
   totalSources: number
   processedSources: number
   currentSourceId: string | null
   status: 'idle' | 'running' | 'completed' | 'error'
   entriesProcessed: number
 }

 export const useAggregationProgress = (enabled: boolean = true) => {
   return useQuery<AggregationProgress>({
     queryKey: ['aggregation', 'progress'],
     queryFn: async () => {
       // Cache-busting query param
       const url = `${API_BASE_URL}/aggregate/progress?t=${Date.now()}`
       const response = await fetch(url, {
         headers: {
           'Cache-Control': 'no-cache',
         },
       })
       if (!response.ok) {
         throw new Error('Failed to fetch aggregation progress')
       }
       const data = await response.json()
       return data.data as AggregationProgress
     },
     enabled,
     refetchInterval: 1000,
     staleTime: 0,
   })
 }
