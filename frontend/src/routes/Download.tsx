import React from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useLatestHostsFile } from '../hooks/useAggregation'
import { Download as DownloadIcon, FileText, Calendar, Hash, DownloadCloud } from 'lucide-react'

const Download = () => {
  const { data: latestFile, isLoading } = useLatestHostsFile()

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const downloadFile = (fileId: string, filename: string) => {
    const url = `${import.meta.env.VITE_API_BASE_URL}/aggregate/download/${fileId}`
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Download</h1>
        <p className="text-muted-foreground">Download the latest unified hosts file</p>
      </div>

      <div className="grid gap-6">
        {/* Latest File Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DownloadCloud className="h-5 w-5" />
              Latest Hosts File
            </CardTitle>
            <CardDescription>
              Download the most recent aggregated hosts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestFile ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-lg font-semibold">{latestFile.filename}</div>
                    <div className="text-sm text-muted-foreground">File Name</div>
                  </div>
                  <div className="text-center">
                    <Hash className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-semibold">{latestFile.totalEntries.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Entries</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg font-semibold">
                      {new Date(latestFile.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">File Size:</span> {formatFileSize(latestFile.size)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(latestFile.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Entries:</span> {latestFile.totalEntries.toLocaleString()} domains
                    </div>
                    <div>
                      <span className="font-medium">ID:</span> {latestFile.id}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => downloadFile(latestFile.id, latestFile.filename)}
                    className="flex-1"
                    size="lg"
                  >
                    <DownloadIcon className="mr-2 h-5 w-5" />
                    Download Latest File
                  </Button>
                  <Button 
                    variant="outline" 
                    asChild
                    className="flex-1"
                    size="lg"
                  >
                    <a 
                      href={`${import.meta.env.VITE_API_BASE_URL}/aggregate/download/${latestFile.id}`}
                      download={latestFile.filename}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Direct Download
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hosts file available</h3>
                <p className="text-muted-foreground mb-6">
                  No unified hosts file has been generated yet. Start aggregation to create one.
                </p>
                <Button asChild>
                  <a href="/aggregate">
                    Go to Aggregation
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
            <CardDescription>
              How to use the downloaded hosts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Windows</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Download the hosts file</li>
                  <li>Navigate to <code className="bg-muted px-1 rounded">C:\Windows\System32\drivers\etc\</code></li>
                  <li>Backup the existing hosts file</li>
                  <li>Replace it with the downloaded file</li>
                  <li>Run <code className="bg-muted px-1 rounded">ipconfig /flushdns</code> in Command Prompt</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">macOS/Linux</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Download the hosts file</li>
                  <li>Navigate to <code className="bg-muted px-1 rounded">/etc/hosts</code></li>
                  <li>Backup the existing hosts file: <code className="bg-muted px-1 rounded">sudo cp /etc/hosts /etc/hosts.backup</code></li>
                  <li>Replace it: <code className="bg-muted px-1 rounded">sudo cp downloaded_hosts.txt /etc/hosts</code></li>
                  <li>Flush DNS: <code className="bg-muted px-1 rounded">sudo dscacheutil -flushcache</code> (macOS) or <code className="bg-muted px-1 rounded">sudo systemctl restart systemd-resolved</code> (Linux)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Information */}
        <Card>
          <CardHeader>
            <CardTitle>File Information</CardTitle>
            <CardDescription>
              Technical details about the hosts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Format</h4>
                <p className="text-sm text-muted-foreground">
                  The file follows the standard hosts file format with each line containing an IP address (127.0.0.1) 
                  followed by domain names to block. Comments start with # and are preserved from source files.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Sources</h4>
                <p className="text-sm text-muted-foreground">
                  This file aggregates content from multiple trusted adblocker hosts file sources. 
                  Each source is validated and deduplicated to ensure optimal performance.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Compatibility</h4>
                <p className="text-sm text-muted-foreground">
                  Compatible with Windows, macOS, Linux, and any system that uses the hosts file for DNS resolution. 
                  The file is UTF-8 encoded and follows POSIX line endings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Download