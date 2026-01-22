import React from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useSources } from '../hooks/useSources'
import { useLatestHostsFile } from '../hooks/useAggregation'
import { Link } from 'react-router-dom'
import { Database, Download, FileText, Plus, Settings } from 'lucide-react'

const Dashboard = () => {
  const { data: sources } = useSources()
  const { data: latestFile } = useLatestHostsFile()

  const enabledSources = sources?.filter(source => source.enabled) || []
  const totalEntries = latestFile?.totalEntries || 0

  const stats = [
    {
      title: 'Total Sources',
      value: sources?.length || 0,
      description: 'Sources configured',
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Enabled Sources',
      value: enabledSources.length,
      description: 'Active for aggregation',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Latest File Entries',
      value: totalEntries.toLocaleString(),
      description: 'Blocked domains',
      icon: Download,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  const quickActions = [
    {
      title: 'Manage Sources',
      description: 'Add, edit, or remove hosts file sources',
      icon: Database,
      href: '/sources',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Start Aggregation',
      description: 'Generate unified hosts file from enabled sources',
      icon: FileText,
      href: '/aggregate',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Download Latest',
      description: 'Get the most recent aggregated hosts file',
      icon: Download,
      href: '/download',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Hosts Aggregator - Manage your adblocker hosts files
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to={action.href}>
                        Go to {action.title.split(' ')[0]}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sources Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sources Overview
            </CardTitle>
            <CardDescription>
              Manage your hosts file sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources && sources.length > 0 ? (
              <div className="space-y-3">
                {sources.slice(0, 5).map((source) => (
                  <div key={source.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-sm text-muted-foreground">{source.url}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${source.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {source.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                ))}
                {sources.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{sources.length - 5} more sources
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No sources configured yet</p>
                <Button asChild>
                  <Link to="/sources">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Source
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest File Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Latest Hosts File
            </CardTitle>
            <CardDescription>
              Most recent aggregated hosts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestFile ? (
              <div className="space-y-4">
                <div>
                  <div className="font-medium">{latestFile.filename}</div>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(latestFile.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{latestFile.totalEntries.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Entries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.round(latestFile.size / 1024).toLocaleString()} KB
                    </div>
                    <div className="text-xs text-muted-foreground">File Size</div>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link to="/download">
                    <Download className="mr-2 h-4 w-4" />
                    Download Latest File
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No hosts file generated yet</p>
                <Button asChild>
                  <Link to="/aggregate">
                    <FileText className="mr-2 h-4 w-4" />
                    Start Aggregation
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard