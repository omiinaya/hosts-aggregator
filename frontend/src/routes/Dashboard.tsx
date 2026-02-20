import React, { useState, useMemo, useCallback } from 'react'
import { 
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { useDebounce } from 'use-debounce'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { useSources } from '../hooks/useSources'
import useApiStatus from '../hooks/useApiStatus'
import {
  useAggregationStats,
  useAggregationHistory,
  useAggregationStatus,
  useAggregate,
  useLatestAggregation,
} from '../hooks/useAggregationStats'
import { useSourceHealth } from '../hooks/useSourceHealth'
import { useHosts } from '../hooks/useHosts'
import { Link } from 'react-router-dom'
import {
  Database,
  Plus,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  TrendingUp,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Globe,
  Zap,
  Download,
  Play,
  Filter,
  ArrowRight,
} from 'lucide-react'

// Custom hook for debounced search
function useDebouncedSearch(delay: number = 500) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm] = useDebounce(searchTerm, delay)

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
  }
}

const Dashboard = () => {
  const { data: sources } = useSources()
  const { status, serveInfo, refreshStatus } = useApiStatus()
  const { data: aggregationStats } = useAggregationStats()
  const { data: aggregationHistory, isLoading: aggHistoryLoading } = useAggregationHistory()
  const { data: aggregationStatus } = useAggregationStatus()
  const { data: latestAggregation, isLoading: latestAggLoading } = useLatestAggregation()
  const { data: sourceHealth, isLoading: healthLoading } = useSourceHealth()
  const aggregateMutation = useAggregate()

  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useDebouncedSearch(500)
  const { data: searchResults, isLoading: searchLoading } = useHosts(
    debouncedSearchTerm ? { search: debouncedSearchTerm, limit: 10 } : {}
  )

  const enabledSources = sources?.filter((source) => source.enabled) || []
  const disabledSources = sources?.filter((source) => !source.enabled) || []

  // Prepare chart data
  const entryTypeData = useMemo(() => {
    if (!latestAggregation) return []
    return [
      { name: 'Block', value: latestAggregation.blockEntries, color: '#ef4444' },
      { name: 'Allow', value: latestAggregation.allowEntries, color: '#22c55e' },
    ]
  }, [latestAggregation])

  const sourceContributionData = useMemo(() => {
    if (!latestAggregation?.sources) return []
    return latestAggregation.sources
      .filter((s) => s.fetchStatus === 'SUCCESS')
      .map((s) => ({
        name: s.source.name,
        entries: s.entriesContributed,
        duration: s.fetchDurationMs,
      }))
      .slice(0, 10)
  }, [latestAggregation])

  const aggregationHistoryData = useMemo(() => {
    if (!aggregationHistory?.length) return []
    return aggregationHistory.slice(0, 10).map((agg) => ({
      date: new Date(agg.timestamp).toLocaleDateString(),
      unique: agg.uniqueEntries,
      duplicates: agg.duplicatesRemoved,
      time: agg.processingTimeMs / 1000,
    }))
  }, [aggregationHistory])

  const handleAggregate = useCallback(() => {
    aggregateMutation.mutate()
  }, [aggregateMutation])

  const stats = [
    {
      title: 'Total Sources',
      value: sources?.length || 0,
      description: `${enabledSources.length} enabled, ${disabledSources.length} disabled`,
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: sources?.length ? ((enabledSources.length / sources.length) * 100).toFixed(0) + '% enabled' : '0%',
    },
    {
      title: 'Total Hosts',
      value: aggregationStats?.totalEntries.toLocaleString() || '0',
      description: aggregationStats?.lastAggregation
        ? `Last updated ${new Date(aggregationStats.lastAggregation).toLocaleDateString()}`
        : 'Never aggregated',
      icon: Globe,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: latestAggregation
        ? `${latestAggregation.uniqueEntries.toLocaleString()} unique`
        : '0 unique',
    },
    {
      title: 'Backend Status',
      value: status.backend === 'online' ? 'Online' : 'Offline',
      description: status.lastChecked
        ? `Last checked ${status.lastChecked.toLocaleTimeString()}`
        : 'Never checked',
      icon: Server,
      color: status.backend === 'online' ? 'text-green-600' : 'text-red-600',
      bgColor: status.backend === 'online' ? 'bg-green-100' : 'bg-red-100',
      trend: status.backend === 'online' ? 'Operational' : 'Down',
    },
    {
      title: 'Serve Endpoint',
      value: status.serveEndpoint === 'online' ? 'Online' : 'Offline',
      description: serveInfo?.hasHostsFile
        ? `${serveInfo.totalEntries.toLocaleString()} entries available`
        : 'No hosts file generated',
      icon: status.serveEndpoint === 'online' ? Wifi : WifiOff,
      color: status.serveEndpoint === 'online' ? 'text-green-600' : 'text-red-600',
      bgColor: status.serveEndpoint === 'online' ? 'bg-green-100' : 'bg-red-100',
      trend: serveInfo?.hasHostsFile ? 'Ready' : 'Not ready',
    },
  ]

  const quickActions = [
    {
      title: 'Aggregate Now',
      description: 'Trigger aggregation of all enabled sources',
      icon: Play,
      action: handleAggregate,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      loading: aggregateMutation.isPending,
    },
    {
      title: 'Download Hosts',
      description: 'Get the unified hosts file',
      icon: Download,
      href: `${window.location.protocol}//${window.location.hostname}:3010/api/serve/hosts`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      external: true,
    },
    {
      title: 'Manage Sources',
      description: 'Add, edit, or remove sources',
      icon: Database,
      href: '/sources',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'View Hosts',
      description: 'Browse and filter aggregated hosts',
      icon: Globe,
      href: '/hosts',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your hosts aggregation system
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAggregate} disabled={aggregateMutation.isPending}>
            {aggregateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Aggregate Now
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{stat.trend}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Aggregation Progress */}
      {aggregationStatus?.status === 'running' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-5 w-5 animate-spin text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Aggregation in progress</p>
                <p className="text-sm text-yellow-700">
                  Processing {aggregationStatus.processedSources} of{' '}
                  {aggregationStatus.totalSources} sources
                  {aggregationStatus.currentSource && (
                    <span> - Current: {aggregationStatus.currentSource}</span>
                  )}
                </p>
                <Progress value={aggregationStatus.progress} className="mt-2" />
              </div>
              <span className="text-sm font-medium text-yellow-900">
                {aggregationStatus.progress}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts & Analytics</TabsTrigger>
          <TabsTrigger value="sources">Sources Health</TabsTrigger>
          <TabsTrigger value="search">Domain Search</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  const buttonContent = (
                    <>
                      <div className={`p-2 rounded-lg ${action.bgColor} mb-2`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <h4 className="font-medium text-sm">{action.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </>
                  )

                  return action.href ? (
                    action.external ? (
                      <a
                        key={index}
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer block"
                      >
                        {buttonContent}
                      </a>
                    ) : (
                      <Link
                        key={index}
                        to={action.href}
                        className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer block"
                      >
                        {buttonContent}
                      </Link>
                    )
                  ) : (
                    <button
                      key={index}
                      onClick={action.action}
                      disabled={action.loading}
                      className="p-4 border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
                    >
                      {buttonContent}
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Aggregation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Latest Aggregation
                </CardTitle>
                <CardDescription>Summary of the last aggregation run</CardDescription>
              </CardHeader>
              <CardContent>
                {latestAggLoading || latestAggregation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Sources</p>
                        <p className="text-lg font-semibold">
                          {latestAggregation?.totalSources || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Successful</p>
                        <p className="text-lg font-semibold text-green-600">
                          {latestAggregation?.successfulSources || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-lg font-semibold text-red-600">
                          {latestAggregation?.failedSources || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Processing Time</p>
                        <p className="text-lg font-semibold">
                          {latestAggregation
                            ? `${(latestAggregation.processingTimeMs / 1000).toFixed(2)}s`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Top Contributors</p>
                      {latestAggregation?.sources
                        ?.filter((s) => s.fetchStatus === 'SUCCESS')
                        .sort((a, b) => b.entriesContributed - a.entriesContributed)
                        .slice(0, 5)
                        .map((source) => (
                          <div
                            key={source.id}
                            className="flex items-center justify-between py-1"
                          >
                            <span className="text-sm truncate flex-1">
                              {source.source.name}
                            </span>
                            <span className="text-sm font-medium">
                              {source.entriesContributed.toLocaleString()} entries
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No aggregation data available</p>
                    <Button onClick={handleAggregate} className="mt-4">
                      Run First Aggregation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Aggregation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aggHistoryLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              ) : aggregationHistory && aggregationHistory.length > 0 ? (
                <div className="space-y-3">
                  {aggregationHistory.slice(0, 5).map((agg) => (
                    <div
                      key={agg.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            agg.failedSources === 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}
                        >
                          {agg.failedSources === 0 ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {agg.uniqueEntries.toLocaleString()} unique entries
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(agg.timestamp).toLocaleString()} •{' '}
                            {(agg.processingTimeMs / 1000).toFixed(2)}s
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{agg.successfulSources}/{agg.totalSources} sources</p>
                        <p className="text-muted-foreground">
                          {agg.duplicatesRemoved.toLocaleString()} duplicates removed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No aggregation history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entry Types Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Entry Types Distribution</CardTitle>
                <CardDescription>Block vs Allow entries</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={entryTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                          label={({ name, percent }: { name: string; percent?: number }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {entryTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source Contributions Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Source Contributors</CardTitle>
                <CardDescription>Entries contributed by each source</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceContributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="entries" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Aggregation History Line Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Aggregation History</CardTitle>
                <CardDescription>Unique entries and processing time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={aggregationHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="unique"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="Unique Entries"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="duplicates"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="Duplicates Removed"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="time"
                      stroke="#22c55e"
                      name="Processing Time (s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sources Health Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sources Health Monitoring
              </CardTitle>
              <CardDescription>
                {sourceHealth ? (
                  <span>
                    {sourceHealth.healthySources} healthy,{' '}
                    {sourceHealth.unhealthySources} unhealthy,{' '}
                    {sourceHealth.unknownSources} unknown
                  </span>
                ) : (
                  'Loading health status...'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading health data...</p>
                </div>
              ) : sources && sources.length > 0 ? (
                <div className="space-y-3">
                  {sources.map((source) => {
                    const health = sourceHealth?.sources?.find(
                      (h) => h.sourceId === source.id
                    )
                    const isHealthy = health?.status === 'healthy'
                    const isUnhealthy = health?.status === 'unhealthy'

                    return (
                      <div
                        key={source.id}
                        className="flex items-center justify-between py-3 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              isHealthy
                                ? 'bg-green-100 text-green-600'
                                : isUnhealthy
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isHealthy ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isUnhealthy ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{source.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {source.url}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              source.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {source.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                          {health && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {health.responseTime > 0
                                ? `${health.responseTime}ms`
                                : 'No data'}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sources configured</p>
                  <Button asChild className="mt-4">
                    <Link to="/sources">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Source
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Domain Search
              </CardTitle>
              <CardDescription>Search for specific domains in the aggregated hosts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search domains..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {searchLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Searching...</p>
                  </div>
                ) : debouncedSearchTerm && searchResults ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Found {searchResults.pagination.total} results for &quot;{debouncedSearchTerm}&quot;
                    </p>
                    <div className="border rounded-lg divide-y">
                      {searchResults.hosts.map((host) => (
                        <div
                          key={host.id}
                          className="flex items-center justify-between p-4"
                        >
                          <div>
                            <p className="font-medium">{host.domain}</p>
                            <p className="text-sm text-muted-foreground">
                              Type: {host.entryType} • Seen: {host.occurrenceCount} times
                            </p>
                          </div>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              host.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {host.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      ))}
                    </div>
                    {searchResults.pagination.total > 10 && (
                      <div className="text-center">
                        <Button variant="outline" asChild>
                          <Link to={`/hosts?search=${encodeURIComponent(debouncedSearchTerm)}`}>
                            View all {searchResults.pagination.total} results
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : debouncedSearchTerm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results found for &quot;{debouncedSearchTerm}&quot;</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a domain name to search</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>Last checked: {status.lastChecked?.toLocaleString() || 'Never'}</p>
      </div>
    </div>
  )
}

export default Dashboard
