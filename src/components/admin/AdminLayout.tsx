import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  Settings, 
  BarChart3, 
  Activity, 
  Shield, 
  LogOut,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react'
import { ImpersonationService } from '@/lib/services/admin/impersonation'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface AdminLayoutProps {
  children?: React.ReactNode
}

const navigation = [
  { name: 'Overview', href: '/admin', icon: BarChart3 },
  { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Security', href: '/admin/security', icon: Shield },
  { name: 'System Settings', href: '/admin/system-settings', icon: Settings },
  { name: 'Global Reports', href: '/admin/global-reports', icon: BarChart3 },
  { name: 'Activity Log', href: '/admin/activity-log', icon: Activity },
  { name: 'Impersonation Log', href: '/admin/impersonation-log', icon: Shield },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [impersonationContext, setImpersonationContext] = useState<{
    isImpersonated: boolean
    impersonatedBy?: string
    impersonatedRole?: string
    organizationId?: string
  }>({ isImpersonated: false })
  
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    // Check impersonation status
    try {
      const context = ImpersonationService.getImpersonationContext()
      setImpersonationContext(context)
    } catch (error) {
      console.warn('Could not get impersonation context:', error)
      setImpersonationContext({ isImpersonated: false })
    }
  }, [])

  const handleEndImpersonation = async () => {
    try {
      await ImpersonationService.endImpersonation('')
      setImpersonationContext({ isImpersonated: false })
      toast({
        title: 'Impersonation Ended',
        description: 'You have ended the impersonation session'
      })
      // Refresh the page to reset the app state
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to end impersonation session',
        variant: 'destructive'
      })
    }
  }

  const handleLogout = async () => {
    try {
      // If impersonating, end impersonation first
      if (impersonationContext.isImpersonated) {
        await ImpersonationService.endImpersonation('')
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'Logged out successfully'
      })
      
      navigate('/login')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      {impersonationContext.isImpersonated && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Impersonating as {impersonationContext.impersonatedRole} in Organization ID: {impersonationContext.organizationId}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEndImpersonation}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              End Impersonation
            </Button>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Button
                  key={item.name}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    navigate(item.href)
                    setSidebarOpen(false)
                  }}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Button
                  key={item.name}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white px-4 shadow-sm lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
