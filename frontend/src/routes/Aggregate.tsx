import React from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { useAggregationStatus, useStartAggregation, useLatestHostsFile } from '../hooks/useAggregation'
import { useSources } from '../hooks/useSources'
import { Play, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

const Aggregate = () => {
  const { data: sources } = useSources()
  const { data: status, isLoading: statusLoading } = useAggregationStatus()
  const { data: latestFile } = useLatestHostsFile()
  const startAggregation = useStartAggregation()

  const enabledSources = sources?.filter(source => source.enabled) || []
  const progress = status?.progress || 0

  const getStatusIcon = () => {
    if (!status) return null
    
    switch (status.status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    if (!status) return 'Ready to aggregate'
    
    switch (status.status) {
      case 'running':
        return `Processing ${status.currentSource || 'sources'} (${status.processedSources}/${status.totalSources})`
      case 'completed':
        return 'Aggregation completed successfully'
      case 'error':
        return `Error: ${status.error || 'Unknown error'}`
      default:
        return 'Ready to aggregate'
    }
  }

  const handleStartAggregation = () => {
    startAggregation.mutate()
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aggregation</h1>
          <p className="text-muted-foreground">Aggregate hosts files from enabled sources</p>
        </div>
        <Button 
          onClick={handleStartAggregation}
          disabled={status?.status === 'running' || enabledSources.length === 0}
        >
          <Play className="mr-2 h-4 w-4" />
          Start Aggregation
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Aggregation Status
            </CardTitle>
            <CardDescription>
              {getStatusText()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status?.status === 'running' && (
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <div className="text-sm text-muted-foreground">
                  Progress: {progress.toFixed(1)}%
                </div>
              </div>
            )}
            {status?.status === 'completed' && (
              <div className="text-green-600 text-sm">
                Aggregation completed successfully
              </div>
            )}
            {status?.status === 'error' && (
              <div className="text-red-600 text-sm">
                {status.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sources Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Sources Summary</CardTitle>
            <CardDescription>
              {enabledSources.length} of {sources?.length || 0} sources enabled for aggregation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{sources?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{enabledSources.length}</div>
                <div className="text-sm text-muted-foreground">Enabled Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{sources?.filter(s => !s.enabled).length || 0}</div>
                <div className="text-sm text-muted-foreground">Disabled Sources</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest File */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Unified Hosts File</CardTitle>
            <CardDescription>
              Download the latest aggregated hosts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestFile ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{latestFile.filename}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(latestFile.size)} • {latestFile.totalEntries.toLocaleString()} entries
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(latestFile.createdAt).toLocaleString()}
                  </div>
                </div>
                <a 
                  href={`${import.meta.env.VITE_API_BASE_URL}/aggregate/download/${latestFile.id}`}
                  download={latestFile.filename}
                >
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No hosts file generated yet. Start aggregation to create one.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enabled Sources List */}
        <Card>
          <CardHeader>
            <CardTitle>Enabled Sources</CardTitle>
            <CardDescription>
              Sources that will be included in the aggregation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enabledSources.length > 0 ? (
              <div className="space-y-2">
                {enabledSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-sm text-muted-foreground">{source.url}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last checked: {source.lastChecked ? new Date(source.lastChecked).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No sources enabled. Enable sources in the Sources page to start aggregation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Aggregate