import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Database,
  Users,
  Calendar,
  DollarSign,
  ExternalLink
} from "lucide-react";
import { ZohoPeopleIntegration } from "@/integrations/zoho";
import { IntegrationHealth, SyncStatus } from "@/integrations/zoho/types";

interface IntegrationDashboardProps {
  integration: ZohoPeopleIntegration;
}

export const IntegrationDashboard = ({ integration }: IntegrationDashboardProps) => {
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [recentSyncs, setRecentSyncs] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Get health status
      const healthStatus = await integration.getMonitoringService().getCurrentHealth();
      setHealth(healthStatus);

      // Get recent sync logs (this would be implemented in the sync service)
      // const syncLogs = await integration.getSyncService().getRecentSyncs();
      // setRecentSyncs(syncLogs);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integration Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your Zoho People integration health and performance
          </p>
        </div>
        <Button 
          onClick={loadDashboardData} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Health Status Alert */}
      {health && health.status !== 'healthy' && (
        <Alert className={health.status === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
          {health.status === 'critical' ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          <AlertDescription>
            {health.status === 'critical' 
              ? 'Integration is experiencing critical issues. Immediate attention required.'
              : 'Integration is experiencing some issues. Monitor closely.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {health && getStatusIcon(health.status)}
                  <span className="text-lg font-semibold capitalize">
                    {health?.status || 'Unknown'}
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">API Response Time</p>
                <p className="text-2xl font-bold">
                  {health?.apiResponseTime || 0}ms
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {health && health.totalSyncs > 0 
                    ? ((health.successfulSyncs / health.totalSyncs) * 100).toFixed(1)
                    : 0
                  }%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Syncs</p>
                <p className="text-2xl font-bold">
                  {health?.totalSyncs || 0}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sync">Sync History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Integration Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Status</span>
                    <Badge className={health ? getStatusColor(health.status) : ''}>
                      {health?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Uptime</span>
                    <span>{health?.uptime || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>{health?.errorRate?.toFixed(2) || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Sync</span>
                    <span>
                      {health?.lastSync 
                        ? new Date(health.lastSync).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Successful Syncs</span>
                    <span className="text-green-600 font-medium">
                      {health?.successfulSyncs || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Failed Syncs</span>
                    <span className="text-red-600 font-medium">
                      {health?.failedSyncs || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Records Processed</span>
                    <span>{health?.totalSyncs || 0}</span>
                  </div>
                </div>
                
                {health && health.totalSyncs > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span>
                        {((health.successfulSyncs / health.totalSyncs) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(health.successfulSyncs / health.totalSyncs) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Operations</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSyncs.length > 0 ? (
                <div className="space-y-2">
                  {recentSyncs.map((sync) => (
                    <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getSyncStatusIcon(sync.status)}
                        <div>
                          <p className="font-medium capitalize">{sync.type} Sync</p>
                          <p className="text-sm text-muted-foreground">
                            {sync.direction} • {sync.recordsProcessed} processed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {sync.status === 'completed' ? 'Completed' : 
                           sync.status === 'failed' ? 'Failed' : 
                           sync.status === 'processing' ? 'Processing' : 'Pending'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sync.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent sync operations
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time</span>
                    <span>{health?.apiResponseTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Response Time</span>
                    <span>{health?.apiResponseTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Peak Response Time</span>
                    <span>{health?.apiResponseTime || 0}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Records Synced Today</span>
                    <span>{health?.totalSyncs || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Volume</span>
                    <span>N/A</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sync Frequency</span>
                    <span>Every 15 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Error Rate Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when error rate exceeds 20%
                    </p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">API Response Time Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when response time exceeds 5 seconds
                    </p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sync Failure Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when sync operations fail
                    </p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
