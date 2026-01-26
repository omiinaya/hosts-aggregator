import React from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useSources } from '../hooks/useSources'
import useApiStatus from '../hooks/useApiStatus'
import { Link } from 'react-router-dom'
import { Database, Plus, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react'

const Dashboard = () => {
  const { data: sources } = useSources()
  const { status, serveInfo, refreshStatus } = useApiStatus()

  const enabledSources = sources?.filter(source => source.enabled) || []

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
      icon: Database,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Backend API',
      value: status.backend === 'online' ? 'Online' : status.backend === 'offline' ? 'Offline' : 'Checking...',
      description: 'Server status',
      icon: Server,
      color: status.backend === 'online' ? 'text-green-600' : status.backend === 'offline' ? 'text-red-600' : 'text-yellow-600',
      bgColor: status.backend === 'online' ? 'bg-green-100' : status.backend === 'offline' ? 'bg-red-100' : 'bg-yellow-100'
    },
    {
      title: 'Serve Endpoint',
      value: status.serveEndpoint === 'online' ? 'Online' : status.serveEndpoint === 'offline' ? 'Offline' : 'Checking...',
      description: serveInfo?.hasHostsFile ? `${serveInfo.totalEntries} entries` : 'No hosts file',
      icon: Wifi,
      color: status.serveEndpoint === 'online' ? 'text-green-600' : status.serveEndpoint === 'offline' ? 'text-red-600' : 'text-yellow-600',
      bgColor: status.serveEndpoint === 'online' ? 'bg-green-100' : status.serveEndpoint === 'offline' ? 'bg-red-100' : 'bg-yellow-100'
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
      title: 'Serve Endpoint',
      description: 'Access the unified hosts file for Pi-hole/AdGuard Home',
      icon: Server,
      href: `${window.location.protocol}//${window.location.hostname}:3010/api/serve/hosts`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Hosts Aggregator - Automatic hosts file aggregation
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
      <div className="mb-8">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow max-w-md">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                    {action.href.startsWith('http') ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={action.href} target="_blank" rel="noopener noreferrer">
                          Open {action.title.split(' ')[0]}
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link to={action.href}>
                          Go to {action.title.split(' ')[0]}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* API Status Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>API Status</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Monitor the status of your backend API and serve endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Backend Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  status.backend === 'online' ? 'bg-green-100 text-green-600' :
                  status.backend === 'offline' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {status.backend === 'online' ? <Wifi className="h-4 w-4" /> :
                   status.backend === 'offline' ? <WifiOff className="h-4 w-4" /> :
                   <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                <div>
                  <div className="font-medium">Backend API</div>
                  <div className="text-sm text-muted-foreground">{`${window.location.protocol}//${window.location.hostname}:3010`}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.backend === 'online' ? 'bg-green-100 text-green-800' :
                status.backend === 'offline' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {status.backend === 'online' ? 'Online' : status.backend === 'offline' ? 'Offline' : 'Checking...'}
              </div>
            </div>

            {/* Serve Endpoint Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  status.serveEndpoint === 'online' ? 'bg-green-100 text-green-600' :
                  status.serveEndpoint === 'offline' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {status.serveEndpoint === 'online' ? <Wifi className="h-4 w-4" /> :
                   status.serveEndpoint === 'offline' ? <WifiOff className="h-4 w-4" /> :
                   <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                <div>
                  <div className="font-medium">Serve Endpoint</div>
                  <div className="text-sm text-muted-foreground">{`${window.location.protocol}//${window.location.hostname}:3010/api/serve/hosts`}</div>
                  {serveInfo && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {serveInfo.message}
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.serveEndpoint === 'online' ? 'bg-green-100 text-green-800' :
                status.serveEndpoint === 'offline' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {status.serveEndpoint === 'online' ? 'Online' : status.serveEndpoint === 'offline' ? 'Offline' : 'Checking...'}
              </div>
            </div>

            {/* Last Checked */}
            {status.lastChecked && (
              <div className="text-xs text-muted-foreground text-right">
                Last checked: {status.lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}

export default Dashboard