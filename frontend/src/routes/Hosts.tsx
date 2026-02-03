import React, { useState, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { useHosts, useHostStats, useToggleHost, useBulkUpdateHosts } from '../hooks/useHosts'
import { HostEntry, HostListParams } from '../types'
import HostsFilters from '../components/hosts/HostsFilters'
import HostsTable from '../components/hosts/HostsTable'
import { Power, PowerOff } from 'lucide-react'

const ITEMS_PER_PAGE = 20

const Hosts = () => {
  // Query state
  const [params, setParams] = useState<HostListParams>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    search: '',
    enabled: undefined,
    entryType: undefined,
    sourceId: undefined,
  })

  // Selection state for bulk operations
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set())

  // Fetch data
  const { data: hostsData, isLoading, error } = useHosts(params)
  const { data: stats } = useHostStats()

  // Mutations
  const toggleHost = useToggleHost()
  const bulkUpdateHosts = useBulkUpdateHosts()

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setParams(prev => ({ ...prev, search: value, page: 1 }))
  }, [])

  const handleFilterChange = useCallback(
    (key: keyof HostListParams, value: string | boolean | undefined) => {
      if (key === 'enabled') {
        setParams(prev => ({ ...prev, [key]: value === 'all' ? undefined : value === 'enabled', page: 1 }))
      } else {
        setParams(prev => ({ ...prev, [key]: value === 'all' ? undefined : value as string, page: 1 }))
      }
    },
    []
  )

  const handlePageChange = useCallback((newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }))
  }, [])

  const handleToggleHost = useCallback(
    (host: HostEntry) => {
      toggleHost.mutate({ id: host.id, enabled: !host.enabled })
    },
    [toggleHost]
  )

  const handleSelectHost = useCallback((hostId: string) => {
    setSelectedHosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(hostId)) {
        newSet.delete(hostId)
      } else {
        newSet.add(hostId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedHosts.size === hostsData?.hosts.length) {
      setSelectedHosts(new Set())
    } else {
      setSelectedHosts(new Set(hostsData?.hosts.map(h => h.id) || []))
    }
  }, [selectedHosts, hostsData])

  const handleBulkEnable = useCallback(() => {
    if (selectedHosts.size === 0) return
    bulkUpdateHosts.mutate({ hostIds: Array.from(selectedHosts), enabled: true })
    setSelectedHosts(new Set())
  }, [selectedHosts, bulkUpdateHosts])

  const handleBulkDisable = useCallback(() => {
    if (selectedHosts.size === 0) return
    bulkUpdateHosts.mutate({ hostIds: Array.from(selectedHosts), enabled: false })
    setSelectedHosts(new Set())
  }, [selectedHosts, bulkUpdateHosts])

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Error loading hosts: {(error as Error).message}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hosts Management</h1>
          <p className="text-muted-foreground">Manage your adblocker hosts entries</p>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Hosts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.enabled.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.disabled.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.byEntryType.block.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Blocked Domains</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Component */}
      <HostsFilters
        searchValue={params.search || ''}
        entryTypeValue={params.entryType || 'all'}
        enabledValue={
          params.enabled === undefined
            ? 'all'
            : params.enabled
            ? 'enabled'
            : 'disabled'
        }
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
      />

      {/* Bulk Actions */}
      {selectedHosts.size > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedHosts.size} host{selectedHosts.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEnable}
                  disabled={bulkUpdateHosts.isPending}
                >
                  <Power className="mr-2 h-4 w-4" />
                  Enable Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDisable}
                  disabled={bulkUpdateHosts.isPending}
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  Disable Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Component */}
      <HostsTable
        hostsData={hostsData}
        selectedHosts={selectedHosts}
        isLoading={isLoading}
        isPending={toggleHost.isPending}
        onSelectHost={handleSelectHost}
        onSelectAll={handleSelectAll}
        onToggleHost={handleToggleHost}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

export default Hosts
