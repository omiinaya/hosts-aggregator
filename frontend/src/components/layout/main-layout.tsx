import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import {
  Home,
  Database,
  Download,
  Settings,
  FileText,
  List,
} from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Sources', href: '/sources', icon: Database },
  { name: 'Hosts', href: '/hosts', icon: List },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-card border-r">
          <div className="p-6">
            <h1 className="text-xl font-bold text-card-foreground">
              Hosts Aggregator
            </h1>
          </div>
          <nav className="space-y-2 px-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isActive && 'bg-secondary'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout