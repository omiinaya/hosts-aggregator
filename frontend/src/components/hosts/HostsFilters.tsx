import React, { useCallback } from 'react'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent } from '../ui/card'
import { Search } from 'lucide-react'
import { HostListParams } from '../../types'

interface HostsFiltersProps {
  searchValue: string
  entryTypeValue: string
  enabledValue: string
  onSearchChange: (value: string) => void
  onFilterChange: (key: keyof HostListParams, value: string | boolean | undefined) => void
}

const HostsFilters: React.FC<HostsFiltersProps> = ({
  searchValue,
  entryTypeValue,
  enabledValue,
  onSearchChange,
  onFilterChange,
}) => {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value)
    },
    [onSearchChange]
  )

  const handleEntryTypeChange = useCallback(
    (value: string) => {
      onFilterChange('entryType', value === 'all' ? undefined : value)
    },
    [onFilterChange]
  )

  const handleEnabledChange = useCallback(
    (value: string) => {
      onFilterChange(
        'enabled',
        value === 'all' ? undefined : value === 'enabled'
      )
    },
    [onFilterChange]
  )

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domain names..."
              value={searchValue}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {/* Entry Type Filter */}
          <div className="w-full md:w-48">
            <Select value={entryTypeValue} onValueChange={handleEntryTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Entry Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="element">Element</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enabled Filter */}
          <div className="w-full md:w-48">
            <Select value={enabledValue} onValueChange={handleEnabledChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default HostsFilters
