import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  Activity, 
  Shield, 
  Bell,
  Database,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { ZohoPeopleIntegration } from "@/integrations/zoho";
import { ZohoConfig } from "@/integrations/zoho/types";

interface ZohoIntegrationConfigProps {
  onClose?: () => void;
}

export const ZohoIntegrationConfig = ({ onClose }: ZohoIntegrationConfigProps) => {
  const [config, setConfig] = useState<ZohoConfig>({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    scope: 'ZohoPeople.employees.ALL,ZohoPeople.attendance.ALL,ZohoPeople.leave.ALL',
    apiBaseUrl: 'https://people.zoho.com/people/api',
    environment: 'sandbox'
  });

  const [integration, setIntegration] = useState<ZohoPeopleIntegration | null>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Load configuration from database or environment
      // This would typically fetch from your settings table
      console.log('Loading Zoho configuration...');
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      
      // Save configuration to database
      // This would typically save to your settings table
      console.log('Saving Zoho configuration:', config);
      
      toast({
        title: "Configuration Saved",
        description: "Zoho People integration configuration has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async () => {
    try {
      setTesting(true);
      
      if (!integration) {
        const newIntegration = new ZohoPeopleIntegration(config);
        setIntegration(newIntegration);
      }

      const testResult = await integration?.testIntegration();
      
      if (testResult?.success) {
        toast({
          title: "Integration Test Passed",
          description: testResult.message,
        });
      } else {
        toast({
          title: "Integration Test Failed",
          description: testResult?.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        title: "Test Failed",
        description: "Failed to test integration. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const initializeIntegration = async () => {
    try {
      setLoading(true);
      
      if (!integration) {
        const newIntegration = new ZohoPeopleIntegration(config);
        setIntegration(newIntegration);
      }

      await integration?.initialize();
      
      toast({
        title: "Integration Initialized",
        description: "Zoho People integration has been initialized successfully.",
      });
    } catch (error) {
      console.error('Error initializing integration:', error);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize integration. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Zoho People Integration</h2>
          <p className="text-muted-foreground">
            Configure and manage your Zoho People integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {healthStatus && (
            <Badge className={getStatusColor(healthStatus.status)}>
              {getStatusIcon(healthStatus.status)}
              <span className="ml-1">{healthStatus.status}</span>
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="authentication">
            <Shield className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Database className="h-4 w-4 mr-2" />
            Sync Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    placeholder="Enter your Zoho People Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    placeholder="Enter your Zoho People Client Secret"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUri">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  type="url"
                  value={config.redirectUri}
                  onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                  placeholder="https://yourdomain.com/auth/callback"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">OAuth Scope</Label>
                <Input
                  id="scope"
                  type="text"
                  value={config.scope}
                  onChange={(e) => setConfig({ ...config, scope: e.target.value })}
                  placeholder="ZohoPeople.employees.ALL,ZohoPeople.attendance.ALL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={config.environment}
                  onValueChange={(value: 'sandbox' | 'production') => 
                    setConfig({ ...config, environment: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveConfiguration} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={testIntegration} disabled={testing}>
                  {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Test Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {authStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {authStatus.authenticated ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>
                      {authStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}
                    </span>
                  </div>
                  {authStatus.expiresAt && (
                    <p className="text-sm text-muted-foreground">
                      Token expires: {new Date(authStatus.expiresAt).toLocaleString()}
                    </p>
                  )}
                  {authStatus.needsRefresh && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Your access token needs to be refreshed. Please re-authenticate.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Authentication status not available</p>
              )}

              <div className="flex gap-2">
                <Button onClick={initializeIntegration} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Initialize Integration
                </Button>
                <Button variant="outline" asChild>
                  <a 
                    href={integration?.getAuthService().generateAuthUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Authenticate with Zoho
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(healthStatus.status)}
                      <span className="capitalize">{healthStatus.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Sync</Label>
                    <p className="text-sm">
                      {healthStatus.lastSync 
                        ? new Date(healthStatus.lastSync).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>API Response Time</Label>
                    <p className="text-sm">{healthStatus.apiResponseTime}ms</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Error Rate</Label>
                    <p className="text-sm">{healthStatus.errorRate.toFixed(2)}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Syncs</Label>
                    <p className="text-sm">{healthStatus.totalSyncs}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Success Rate</Label>
                    <p className="text-sm">
                      {healthStatus.totalSyncs > 0 
                        ? ((healthStatus.successfulSyncs / healthStatus.totalSyncs) * 100).toFixed(2)
                        : 0
                      }%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Health status not available</p>
              )}

              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Employee Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Synchronize employee data from Zoho People
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attendance Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Synchronize attendance records
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Leave Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Synchronize leave requests
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payroll Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Send payroll results to Zoho People
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sync Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveConfiguration} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Sync Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
