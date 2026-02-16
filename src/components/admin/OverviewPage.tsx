import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  DollarSign, 
  Activity,
  TrendingUp,
  AlertCircle,
  Settings
} from 'lucide-react'
import { OrganizationService } from '@/lib/services/admin/organizations'
import { ImpersonationService } from '@/lib/services/admin/impersonation'
import { supabase } from '@/integrations/supabase/client'

interface OverviewStats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  totalPayrolls: number
  totalRevenue: number
  recentActivity: number
}

interface RecentActivity {
  id: string
  action: string
  resource_type: string
  user_id: string
  created_at: string
  user?: {
    first_name?: string
    last_name?: string
  }
}

export function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalPayrolls: 0,
    totalRevenue: 0,
    recentActivity: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [impersonationSessions, setImpersonationSessions] = useState(0)

  useEffect(() => {
    loadOverviewData()
  }, [])

  const loadOverviewData = async () => {
    try {
      setLoading(true)

      // Load organizations
      const organizations = await OrganizationService.listOrganizations()
      const activeOrgs = organizations.filter(org => org.active)

      // Load users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      // Load payrolls count
      const { count: payrollsCount } = await supabase
        .from('master_payrolls')
        .select('*', { count: 'exact', head: true })

      // Load total revenue (sum of all payrolls)
      const { data: revenueData } = await supabase
        .from('master_payrolls')
        .select('total_gross')
        .eq('payroll_status', 'approved')

      const totalRevenue = revenueData?.reduce((sum, payroll) => sum + (payroll.total_gross || 0), 0) || 0

      // Load recent activity
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          resource_type,
          user_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load active impersonation sessions
      let activeSessions = []
      try {
        activeSessions = await ImpersonationService.getActiveImpersonationSessions()
      } catch (error) {
        console.warn('Could not load active impersonation sessions:', error)
      }

      setStats({
        totalOrganizations: organizations.length,
        activeOrganizations: activeOrgs.length,
        totalUsers: usersCount || 0,
        totalPayrolls: payrollsCount || 0,
        totalRevenue,
        recentActivity: activityData?.length || 0
      })

      setRecentActivity((activityData || []) as RecentActivity[])
      setImpersonationSessions(activeSessions.length)

    } catch (error) {
      console.error('Error loading overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of the multi-tenant payroll system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Organizations</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalOrganizations}</p>
                  <Badge variant="secondary" className="ml-2">
                    {stats.activeOrganizations} active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Payrolls Processed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPayrolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {impersonationSessions > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {impersonationSessions} active impersonation session{impersonationSessions > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600">
                  Monitor active impersonation sessions for security
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system activities across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">
                          {activity.user?.first_name} {activity.user?.last_name}
                        </span>
                        {' '}
                        {activity.action}
                        {' '}
                        <span className="text-gray-500">{activity.resource_type}</span>
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Create New Organization
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
