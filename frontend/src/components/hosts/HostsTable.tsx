import React, { useCallback } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  Globe,
} from 'lucide-react'
import { HostEntry, HostListResponse } from '../../types'

interface HostsTableProps {
  hostsData: HostListResponse | undefined
  selectedHosts: Set<string>
  isLoading: boolean
  isPending: boolean
  onSelectHost: (hostId: string) => void
  onSelectAll: () => void
  onToggleHost: (host: HostEntry) => void
  onPageChange: (newPage: number) => void
}

const HostsTable: React.FC<HostsTableProps> = ({
  hostsData,
  selectedHosts,
  isLoading,
  isPending,
  onSelectHost,
  onSelectAll,
  onToggleHost,
  onPageChange,
}) => {
  const getEntryTypeBadgeClass = useCallback((type: string): string => {
    switch (type) {
      case 'block':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'allow':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'element':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Hosts</CardTitle>
          <span className="text-sm text-muted-foreground">
            {hostsData?.pagination.total.toLocaleString()} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-muted rounded-t-lg text-sm font-medium">
          <div className="col-span-1 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSelectAll}
            >
              {selectedHosts.size === hostsData?.hosts.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="col-span-4">Domain</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2 text-center">Occurrences</div>
          <div className="col-span-2 text-center">Sources</div>
          <div className="col-span-1 text-center">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {hostsData?.hosts.map((host) => (
            <div
              key={host.id}
              className="grid grid-cols-12 gap-4 py-3 px-4 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-1 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onSelectHost(host.id)}
                >
                  {selectedHosts.has(host.id) ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate" title={host.domain}>
                    {host.domain}
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntryTypeBadgeClass(
                    host.entryType
                  )}`}
                >
                  {host.entryType}
                </span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm">{host.occurrenceCount.toLocaleString()}</span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm">{host.sources.length}</span>
              </div>

              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={host.enabled}
                  onCheckedChange={() => onToggleHost(host)}
                  disabled={isPending}
                />
              </div>
            </div>
          ))}

          {hostsData?.hosts.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No hosts found matching your criteria.
            </div>
          )}
        </div>

        {/* Pagination */}
        {hostsData && hostsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {hostsData.pagination.page} of {hostsData.pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(hostsData.pagination.page - 1)}
                disabled={hostsData.pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(hostsData.pagination.page + 1)}
                disabled={hostsData.pagination.page === hostsData.pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default HostsTable
