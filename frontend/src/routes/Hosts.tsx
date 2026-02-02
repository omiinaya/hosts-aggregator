import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import {
  useHosts,
  useHostStats,
  useToggleHost,
  useBulkUpdateHosts,
  useBulkToggleHosts
} from '../hooks/useHosts'
import { HostEntry, HostStats as HostStatsType, HostListParams } from '../types'
import { Check, ChevronLeft, ChevronRight, Search, Power, PowerOff } from 'lucide-react'

const Hosts = () => {
  // Filter state
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'block' | 'allow' | 'element'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set())
  const [selectedHost, setSelectedHost] = useState<HostEntry | null>(null)

  // Debounce timeout ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search input
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [search])

  // Reset page when debounced search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  // Build query params
  const params: HostListParams = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    enabled: enabledFilter === 'all' ? undefined : enabledFilter === 'enabled',
    entryType: entryTypeFilter === 'all' ? undefined : entryTypeFilter,
    sourceId: sourceFilter === 'all' ? undefined : sourceFilter,
  }), [page, debouncedSearch, enabledFilter, entryTypeFilter, sourceFilter])

  // Fetch data
  const { data: hostsData, loading: hostsLoading, error: hostsError, refetch } = useHosts(params)
  const { data: stats, loading: statsLoading } = useHostStats()
  
  // Mutation hooks
  const { toggleHost } = useToggleHost()
  const { bulkUpdateHosts } = useBulkUpdateHosts()
  const { bulkToggleHosts } = useBulkToggleHosts()

  // Handle individual host toggle
  const handleToggleHost = async (host: HostEntry) => {
    try {
      await toggleHost(host.id, !host.enabled)
      refetch()
    } catch (error) {
      console.error('Failed to toggle host:', error)
    }
  }

  // Handle bulk enable
  const handleBulkEnable = async () => {
    if (selectedHosts.size === 0) return
    try {
      await bulkUpdateHosts({ hostIds: Array.from(selectedHosts), enabled: true })
      setSelectedHosts(new Set())
      refetch()
    } catch (error) {
      console.error('Failed to enable hosts:', error)
    }
  }

  // Handle bulk disable
  const handleBulkDisable = async () => {
    if (selectedHosts.size === 0) return
    try {
      await bulkUpdateHosts({ hostIds: Array.from(selectedHosts), enabled: false })
      setSelectedHosts(new Set())
      refetch()
    } catch (error) {
      console.error('Failed to disable hosts:', error)
    }
  }

  // Handle bulk toggle
  const handleBulkToggle = async () => {
    if (selectedHosts.size === 0) return
    try {
      await bulkToggleHosts({ hostIds: Array.from(selectedHosts) })
      setSelectedHosts(new Set())
      refetch()
    } catch (error) {
      console.error('Failed to toggle hosts:', error)
    }
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && hostsData?.hosts) {
      setSelectedHosts(new Set(hostsData.hosts.map(h => h.id)))
    } else {
      setSelectedHosts(new Set())
    }
  }

  // Handle individual checkbox
  const handleSelectHost = (hostId: string, checked: boolean) => {
    const newSelected = new Set(selectedHosts)
    if (checked) {
      newSelected.add(hostId)
    } else {
      newSelected.delete(hostId)
    }
    setSelectedHosts(newSelected)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSelectedHosts(new Set())
  }

  // Get entry type badge color
  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'block': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'allow': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'element': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (hostsLoading || statsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (hostsError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Error loading hosts: {(hostsError as Error).message}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allSelected = hostsData?.hosts.length > 0 && selectedHosts.size === hostsData.hosts.length
  const someSelected = selectedHosts.size > 0 && !allSelected

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hosts Management</h1>
        <p className="text-muted-foreground">View and manage individual host entries</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Hosts</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Enabled</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.enabled}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Disabled</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.disabled}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Entry Types</CardDescription>
              <div className="flex gap-2 text-sm mt-2">
                <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Block: {stats.byEntryType.block}
                </span>
                <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Allow: {stats.byEntryType.allow}
                </span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Element: {stats.byEntryType.element}
                </span>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Source Breakdown */}
      {stats && stats.bySource.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Hosts by Source</CardTitle>
            <CardDescription>Number of hosts from each source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.bySource.map((source) => (
                <div key={source.sourceId} className="text-sm">
                  <div className="font-medium truncate" title={source.sourceName}>{source.sourceName}</div>
                  <div className="text-muted-foreground">{source.hostCount} hosts</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by domain..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="enabled-filter">Status</Label>
              <Select value={enabledFilter} onValueChange={(value: any) => {
                setEnabledFilter(value)
                setPage(1)
              }}>
                <SelectTrigger id="enabled-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="entry-type-filter">Entry Type</Label>
              <Select value={entryTypeFilter} onValueChange={(value: any) => {
                setEntryTypeFilter(value)
                setPage(1)
              }}>
                <SelectTrigger id="entry-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="element">Element</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="source-filter">Source</Label>
              <Select value={sourceFilter} onValueChange={(value) => {
                setSourceFilter(value)
                setPage(1)
              }}>
                <SelectTrigger id="source-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {stats?.bySource.map((source) => (
                    <SelectItem key={source.sourceId} value={source.sourceId}>
                      {source.sourceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedHosts.size > 0 && (
        <Card className="mb-4 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedHosts.size} host(s) selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkEnable}>
                  <Power className="mr-2 h-4 w-4" />
                  Enable Selected
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDisable}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Disable Selected
                </Button>
                <Button size="sm" onClick={handleBulkToggle}>
                  Toggle Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Host List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-4 text-left font-medium">Domain</th>
                  <th className="p-4 text-left font-medium">Type</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Occurrences</th>
                  <th className="p-4 text-left font-medium">Sources</th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hostsData?.hosts.map((host) => (
                  <tr 
                    key={host.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedHost(host)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedHosts.has(host.id)}
                        onChange={(e) => handleSelectHost(host.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-4 font-medium">{host.domain}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEntryTypeColor(host.entryType)}`}>
                        {host.entryType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${host.enabled ? 'text-green-600' : 'text-red-600'}`}>
                          {host.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{host.occurrenceCount}</td>
                    <td className="p-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {host.sources.slice(0, 2).map((source) => (
                          <span key={source.id} className="px-2 py-1 bg-muted rounded text-xs">
                            {source.name}
                          </span>
                        ))}
                        {host.sources.length > 2 && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            +{host.sources.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={host.enabled}
                        onCheckedChange={() => handleToggleHost(host)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hostsData?.hosts.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No hosts found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {hostsData && hostsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((hostsData.pagination.page - 1) * hostsData.pagination.limit) + 1} to{' '}
            {Math.min(hostsData.pagination.page * hostsData.pagination.limit, hostsData.pagination.total)} of{' '}
            {hostsData.pagination.total} hosts
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(hostsData.pagination.page - 1)}
              disabled={hostsData.pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, hostsData.pagination.totalPages) }, (_, i) => {
                let pageNum
                if (hostsData.pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (hostsData.pagination.page <= 3) {
                  pageNum = i + 1
                } else if (hostsData.pagination.page >= hostsData.pagination.totalPages - 2) {
                  pageNum = hostsData.pagination.totalPages - 4 + i
                } else {
                  pageNum = hostsData.pagination.page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === hostsData.pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(hostsData.pagination.page + 1)}
              disabled={hostsData.pagination.page === hostsData.pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Host Details Dialog */}
      <Dialog open={!!selectedHost} onOpenChange={(open) => !open && setSelectedHost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Host Details</DialogTitle>
            <DialogDescription>
              Full information for {selectedHost?.domain}
            </DialogDescription>
          </DialogHeader>
          {selectedHost && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Domain</Label>
                  <div className="font-medium">{selectedHost.domain}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Normalized</Label>
                  <div className="font-medium">{selectedHost.normalized}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entry Type</Label>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEntryTypeColor(selectedHost.entryType)}`}>
                      {selectedHost.entryType}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className={`font-medium ${selectedHost.enabled ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedHost.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Occurrences</Label>
                  <div className="font-medium">{selectedHost.occurrenceCount}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">First Seen</Label>
                  <div className="font-medium">{new Date(selectedHost.firstSeen).toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Seen</Label>
                  <div className="font-medium">{new Date(selectedHost.lastSeen).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block">Sources</Label>
                <div className="space-y-3">
                  {selectedHost.sources.map((source) => (
                    <Card key={source.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{source.name}</div>
                            <div className="text-sm text-muted-foreground">{source.type}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${source.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {source.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        {source.lineNumber && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Line:</span> {source.lineNumber}
                          </div>
                        )}
                        {source.rawLine && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm font-mono">
                            {source.rawLine}
                          </div>
                        )}
                        {source.comment && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
                            {source.comment}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Hosts
