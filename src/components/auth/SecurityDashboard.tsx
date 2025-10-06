import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Users, Activity, Eye, Lock, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { securityService, SecurityEvent } from '@/lib/services/security';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface SecurityDashboardData {
  recentEvents: SecurityEvent[];
  failedLogins: number;
  activeSessions: number;
  securityScore: number;
}

export function SecurityDashboard() {
  const [data, setData] = useState<SecurityDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const dashboardData = await securityService.getSecurityDashboard(user.id);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSecurityScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getEventIcon = (action: string, result: string) => {
    if (action.includes('login')) {
      return result === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (action.includes('session')) {
      return <Users className="w-4 h-4 text-blue-500" />;
    }
    if (action.includes('mfa')) {
      return <Smartphone className="w-4 h-4 text-purple-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const getEventSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load security data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Security Dashboard</h2>
          <p className="text-slate-600">Monitor your account security and activity</p>
        </div>
        <Button onClick={loadSecurityData} variant="outline" size="sm">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Security Score */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Security Score</p>
                <p className={cn("text-2xl font-bold", getSecurityScoreColor(data.securityScore))}>
                  {data.securityScore}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Shield className={cn("w-6 h-6", getSecurityScoreColor(data.securityScore))} />
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={data.securityScore} 
                className="h-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                {data.securityScore >= 80 ? 'Excellent' : 
                 data.securityScore >= 60 ? 'Good' : 
                 data.securityScore >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Sessions</p>
                <p className="text-2xl font-bold text-slate-900">{data.activeSessions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Currently logged in devices
            </p>
          </CardContent>
        </Card>

        {/* Failed Logins */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Failed Logins</p>
                <p className="text-2xl font-bold text-slate-900">{data.failedLogins}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Recent Events</p>
                <p className="text-2xl font-bold text-slate-900">{data.recentEvents.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Security events logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Recommendations
              </CardTitle>
              <CardDescription>
                Based on your current security status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.securityScore < 80 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your security score could be improved. Consider enabling MFA and reviewing your recent activity.
                  </AlertDescription>
                </Alert>
              )}
              
              {data.failedLogins > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {data.failedLogins} failed login attempts detected. If these weren't you, consider changing your password.
                  </AlertDescription>
                </Alert>
              )}

              {data.activeSessions > 3 && (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    You have {data.activeSessions} active sessions. Consider logging out from unused devices.
                  </AlertDescription>
                </Alert>
              )}

              {data.securityScore >= 80 && data.failedLogins === 0 && data.activeSessions <= 3 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your account security looks good! Keep up the good practices.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Latest security-related activities on your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No recent security events</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.action, event.result)}
                        <div>
                          <p className="font-medium text-slate-900">
                            {event.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-sm text-slate-600">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEventSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <Badge variant={event.result === 'success' ? 'default' : 'destructive'}>
                          {event.result}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Session management coming soon</p>
                <p className="text-sm">You can view and manage your active sessions here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
