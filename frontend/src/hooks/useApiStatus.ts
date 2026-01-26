import { useState, useEffect } from 'react'

interface ApiStatus {
  backend: 'online' | 'offline' | 'checking'
  serveEndpoint: 'online' | 'offline' | 'checking'
  lastChecked: Date | null
}

interface ServeInfo {
  hasHostsFile: boolean
  lastGenerated: string | null
  totalEntries: number
  message: string
}

const API_BASE_URL = 'http://192.168.1.35:3010'

const useApiStatus = () => {
  const [status, setStatus] = useState<ApiStatus>({
    backend: 'checking',
    serveEndpoint: 'checking',
    lastChecked: null
  })

  const [serveInfo, setServeInfo] = useState<ServeInfo | null>(null)

  const checkBackendStatus = async (): Promise<'online' | 'offline'> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.status === 'OK' ? 'online' : 'offline'
      }
      return 'offline'
    } catch (error) {
      return 'offline'
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const checkServeEndpoint = async (): Promise<'online' | 'offline'> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/serve/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success') {
          setServeInfo(data.data)
          return 'online'
        }
      }
      return 'offline'
    } catch (error) {
      return 'offline'
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const checkAllStatuses = async () => {
    setStatus(prev => ({
      ...prev,
      backend: 'checking',
      serveEndpoint: 'checking'
    }))

    const [backendStatus, serveStatus] = await Promise.all([
      checkBackendStatus(),
      checkServeEndpoint()
    ])

    setStatus({
      backend: backendStatus,
      serveEndpoint: serveStatus,
      lastChecked: new Date()
    })
  }

  useEffect(() => {
    checkAllStatuses()

    // Check every 30 seconds
    const interval = setInterval(checkAllStatuses, 30000)

    return () => clearInterval(interval)
  }, [])

  const refreshStatus = () => {
    checkAllStatuses()
  }

  return {
    status,
    serveInfo,
    refreshStatus
  }
}

export default useApiStatus