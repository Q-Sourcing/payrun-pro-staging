import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LockedUsersList } from '@/components/security/LockedUsersList';
import { AuthEventsTable } from '@/components/security/AuthEventsTable';
import { SecurityService, type SecuritySettings } from '@/lib/services/security/security-service';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';

export function SecuritySettingsPage() {
  const { profile } = useSupabaseAuth();
  const { hasRole } = useUserRole();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lockoutThreshold, setLockoutThreshold] = useState(5);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  // Check if user has permission (org_super_admin or platform_admin)
  const canAccess = hasRole('org_super_admin') || hasRole('platform_admin');

  useEffect(() => {
    if (!canAccess || !profile?.organization_id) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const securitySettings = await SecurityService.getSecuritySettings(profile.organization_id!);
        setSettings(securitySettings);
        if (securitySettings) {
          setLockoutThreshold(securitySettings.lockout_threshold);
          setEmailAlertsEnabled(securitySettings.email_alerts_enabled);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load security settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [profile?.organization_id, canAccess]);

  const handleSave = async () => {
    if (!profile?.organization_id) return;

    try {
      setIsSaving(true);
      await SecurityService.updateSecuritySettings({
        org_id: profile.organization_id,
        lockout_threshold: lockoutThreshold,
        email_alerts_enabled: emailAlertsEnabled,
      });

      toast({
        title: 'Success',
        description: 'Security settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update security settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access security settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage account lockout settings and view security events for your organization
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Lockout Configuration</CardTitle>
          <CardDescription>
            Configure how many failed login attempts trigger an account lockout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="lockout-threshold">
              Lockout Threshold (Failed Attempts)
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="lockout-threshold"
                type="number"
                min={3}
                max={10}
                value={lockoutThreshold}
                onChange={(e) => setLockoutThreshold(parseInt(e.target.value) || 5)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Accounts will be locked after {lockoutThreshold} consecutive failed login attempts
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: 3, Maximum: 10
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-alerts">Email Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications to admins when accounts are locked
              </p>
            </div>
            <Switch
              id="email-alerts"
              checked={emailAlertsEnabled}
              onCheckedChange={setEmailAlertsEnabled}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Locked Users */}
      <LockedUsersList orgId={profile?.organization_id} />

      {/* Auth Events */}
      <AuthEventsTable orgId={profile?.organization_id} />
    </div>
  );
}

