import { useState, useEffect, useCallback } from 'react'
import {
  HostEntry,
  HostListResponse,
  HostStats,
  HostListParams,
  BulkUpdateHostsRequest,
  BulkToggleHostsRequest,
  UpdateHostRequest,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Fetches hosts with pagination and filtering
 */
export const useHosts = (params?: HostListParams) => {
  const [data, setData] = useState<HostListResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.enabled !== undefined) queryParams.append('enabled', params.enabled.toString())
      if (params?.entryType) queryParams.append('entryType', params.entryType)
      if (params?.search) queryParams.append('search', params.search)
      if (params?.sourceId) queryParams.append('sourceId', params.sourceId)

      const url = `${API_BASE_URL}/hosts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch hosts: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchHosts()
  }, [fetchHosts])

  return { data, loading, error, refetch: fetchHosts }
}

/**
 * Fetches host statistics
 */
export const useHostStats = () => {
  const [data, setData] = useState<HostStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/stats`)

      if (!response.ok) {
        throw new Error(`Failed to fetch host stats: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { data, loading, error, refetch: fetchStats }
}

/**
 * Fetches a single host by ID
 */
export const useHost = (id: string) => {
  const [data, setData] = useState<HostEntry | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHost = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/${id}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch host: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchHost()
  }, [fetchHost])

  return { data, loading, error, refetch: fetchHost }
}

/**
 * Toggles a single host's enabled status
 */
export const useToggleHost = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const toggleHost = useCallback(async (id: string, enabled: boolean) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled } as UpdateHostRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to toggle host: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { toggleHost, loading, error }
}

/**
 * Bulk updates multiple hosts
 */
export const useBulkUpdateHosts = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const bulkUpdateHosts = useCallback(async (request: BulkUpdateHostsRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to bulk update hosts: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { bulkUpdateHosts, loading, error }
}

/**
 * Bulk toggles multiple hosts
 */
export const useBulkToggleHosts = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const bulkToggleHosts = useCallback(async (request: BulkToggleHostsRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/bulk/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to bulk toggle hosts: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { bulkToggleHosts, loading, error }
}
