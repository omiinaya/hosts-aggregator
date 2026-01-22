import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Save, RefreshCw, Trash2 } from 'lucide-react'

const Settings = () => {
  const [settings, setSettings] = useState({
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    autoRefresh: true,
    refreshInterval: '5',
    theme: 'system',
    cacheEnabled: true,
    maxFileSize: '10'
  })

  const handleSave = () => {
    // In a real app, this would save to localStorage or backend
    console.log('Saving settings:', settings)
    // Show success message
  }

  const handleReset = () => {
    setSettings({
      apiUrl: 'http://localhost:3001',
      autoRefresh: true,
      refreshInterval: '5',
      theme: 'system',
      cacheEnabled: true,
      maxFileSize: '10'
    })
  }

  const handleClearCache = () => {
    // In a real app, this would clear the cache
    console.log('Clearing cache')
    // Show success message
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <div className="grid gap-6">
        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Configure backend API connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apiUrl">API Base URL</Label>
                <Input
                  id="apiUrl"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  placeholder="http://localhost:3001"
                />
              </div>
              <div>
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="cacheEnabled"
                checked={settings.cacheEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, cacheEnabled: checked })}
              />
              <Label htmlFor="cacheEnabled">Enable caching</Label>
            </div>
          </CardContent>
        </Card>

        {/* UI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Interface Settings</CardTitle>
            <CardDescription>
              Customize the user interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select value={settings.theme} onValueChange={(value: string) => setSettings({ ...settings, theme: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="refreshInterval">Auto-refresh Interval (minutes)</Label>
                <Select value={settings.refreshInterval} onValueChange={(value: string) => setSettings({ ...settings, refreshInterval: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRefresh: checked })}
              />
              <Label htmlFor="autoRefresh">Enable auto-refresh</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Manage application data and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleSave} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button variant="outline" onClick={handleClearCache} className="flex-1">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Application information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Built with:</span>
                <span>React + TypeScript + shadcn/ui</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backend:</span>
                <span>Node.js + Express + Prisma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License:</span>
                <span>MIT</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings