import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { useSources, useCreateSource, useUpdateSource, useDeleteSource, useRefreshSource } from '../hooks/useSources'
import { Source } from '../types'
import { Plus, Edit, Trash2, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'

const Sources = () => {
  const { data: sources, isLoading, error } = useSources()
  const createSource = useCreateSource()
  const updateSource = useUpdateSource()
  const deleteSource = useDeleteSource()
  const refreshSource = useRefreshSource()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    enabled: true,
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSource.mutate(formData, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
        setFormData({ name: '', url: '', enabled: true })
      }
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSource) return
    
    updateSource.mutate({
      id: editingSource.id,
      ...formData
    }, {
      onSuccess: () => {
        setEditingSource(null)
        setFormData({ name: '', url: '', enabled: true })
      }
    })
  }

  const handleDelete = () => {
    if (!deleteSourceId) return
    deleteSource.mutate(deleteSourceId, {
      onSuccess: () => {
        setDeleteSourceId(null)
      }
    })
  }

  const handleEdit = (source: Source) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      enabled: source.enabled,
    })
  }

  const handleToggleEnabled = (source: Source) => {
    updateSource.mutate({
      id: source.id,
      enabled: !source.enabled,
    })
  }

  const handleRefresh = (id: string) => {
    setRefreshingId(id)
    refreshSource.mutate(id, {
      onSettled: () => {
        setRefreshingId(null)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Error loading sources: {(error as Error).message}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sources Management</h1>
          <p className="text-muted-foreground">Manage your adblocker hosts file sources</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      <div className="grid gap-4">
        {sources?.map((source) => (
          <Card key={source.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={() => handleToggleEnabled(source)}
                  />
                  <div>
                    <h3 className="font-semibold">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">{source.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Last checked: {source.lastChecked ? new Date(source.lastChecked).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefresh(source.id)}
                    disabled={refreshingId === source.id}
                  >
                    {refreshingId === source.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(source)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteSourceId(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {sources?.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No sources configured yet.</p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first source
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingSource} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setEditingSource(null)
          setFormData({ name: '', url: '', enabled: true })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Source' : 'Add New Source'}
            </DialogTitle>
            <DialogDescription>
              {editingSource 
                ? 'Update the source details below.'
                : 'Add a new adblocker hosts file source to aggregate.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingSource ? handleEditSubmit : handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Source name"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">
                  URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://example.com/hosts.txt"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="enabled" className="text-right">
                  Enabled
                </Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, enabled: checked })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingSource ? 'Update Source' : 'Add Source'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSourceId} onOpenChange={(open) => !open && setDeleteSourceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this source? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSourceId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Sources