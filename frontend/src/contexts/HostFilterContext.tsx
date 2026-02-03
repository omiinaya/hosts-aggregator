import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'

export interface HostFilters {
  search: string
  enabledFilter: 'all' | 'enabled' | 'disabled'
  entryTypeFilter: 'all' | 'block' | 'allow' | 'element'
  sourceFilter: string
}

// Separate context for reading filters (used by HostsData)
interface HostFilterReadContextType {
  filters: HostFilters
}

const HostFilterReadContext = createContext<HostFilterReadContextType | undefined>(undefined)

// Separate context for updating filters (used by HostFilters)
interface HostFilterUpdateContextType {
  updateFilters: (filters: Partial<HostFilters>) => void
  resetFilters: () => void
}

const HostFilterUpdateContext = createContext<HostFilterUpdateContextType | undefined>(undefined)

const defaultFilters: HostFilters = {
  search: '',
  enabledFilter: 'all',
  entryTypeFilter: 'all',
  sourceFilter: 'all'
}

export const HostFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<HostFilters>(defaultFilters)

  // Update filters - only triggers re-render if values actually change
  const updateFilters = useCallback((newFilters: Partial<HostFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters }
      
      // Check if anything actually changed
      if (
        prev.search === updated.search &&
        prev.enabledFilter === updated.enabledFilter &&
        prev.entryTypeFilter === updated.entryTypeFilter &&
        prev.sourceFilter === updated.sourceFilter
      ) {
        return prev // Return same reference to prevent re-render
      }
      
      return updated
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Memoize the read context value - only changes when filters change
  const readContextValue = useMemo(() => ({
    filters
  }), [filters])

  // Memoize the update context value - stable reference, never changes
  const updateContextValue = useMemo(() => ({
    updateFilters,
    resetFilters
  }), [updateFilters, resetFilters])

  return (
    <HostFilterReadContext.Provider value={readContextValue}>
      <HostFilterUpdateContext.Provider value={updateContextValue}>
        {children}
      </HostFilterUpdateContext.Provider>
    </HostFilterReadContext.Provider>
  )
}

// Hook for reading filters - used by components that need to know current filter values
export const useHostFilters = () => {
  const context = useContext(HostFilterReadContext)
  if (context === undefined) {
    throw new Error('useHostFilters must be used within a HostFilterProvider')
  }
  return context.filters
}

// Hook for updating filters - used by components that only need to update filters
// This hook will NOT cause re-renders when filters change
export const useHostFilterActions = () => {
  const context = useContext(HostFilterUpdateContext)
  if (context === undefined) {
    throw new Error('useHostFilterActions must be used within a HostFilterProvider')
  }
  return context
}
