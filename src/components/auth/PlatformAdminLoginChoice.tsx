import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformAdminLoginChoiceProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

export function PlatformAdminLoginChoice({ open, onClose, userEmail }: PlatformAdminLoginChoiceProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'platform' | 'org' | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Load organizations when dialog opens
  React.useEffect(() => {
    if (open) {
      loadOrganizations();
    }
  }, [open]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error loading organizations:', error);
        setOrganizations([]);
      } else {
        setOrganizations(data || []);
      }
    } catch (err) {
      console.error('Exception loading organizations:', err);
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handlePlatformAdminLogin = async () => {
    setLoading('platform');
    try {
      // Store platform admin mode in localStorage
      localStorage.setItem('login_mode', 'platform_admin');
      // Navigate to platform admin dashboard
      navigate('/platform-admin');
      onClose();
    } catch (error) {
      console.error('Error setting platform admin mode:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleOrganizationLogin = async (orgId: string) => {
    setLoading('org');
    try {
      // Store organization selection
      localStorage.setItem('login_mode', 'organization');
      localStorage.setItem('active_organization_id', orgId);
      // Navigate to dashboard
      navigate('/');
      onClose();
    } catch (error) {
      console.error('Error setting organization:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choose Login Mode</DialogTitle>
          <DialogDescription>
            You have platform administrator access. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Platform Admin Option */}
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={handlePlatformAdminLogin}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <CardTitle>Login as Platform Admin</CardTitle>
                  <CardDescription>
                    Access platform-wide settings and manage all organizations
                  </CardDescription>
                </div>
                {loading === 'platform' && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage users across all organizations, configure platform settings, and access global reports.
              </p>
            </CardContent>
          </Card>

          {/* Organization Login Option */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Login into Organization
            </h3>
            {loadingOrgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading organizations...</span>
              </div>
            ) : organizations.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <p className="text-sm text-muted-foreground text-center">
                    No organizations found. Please create an organization first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {organizations.map((org) => (
                  <Card
                    key={org.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleOrganizationLogin(org.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Access organization dashboard and settings
                          </p>
                        </div>
                        {loading === 'org' && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={!!loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

