import { LockedUsersList } from '@/components/security/LockedUsersList';
import { AuthEventsTable } from '@/components/security/AuthEventsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRole } from '@/hooks/use-user-role';
import { Shield } from 'lucide-react';

export function AdminSecurityDashboard() {
  const { hasRole } = useUserRole();

  // Check if user is platform_admin
  const canAccess = hasRole('platform_admin');

  if (!canAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must be a platform administrator to access the global security dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Global Security Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor authentication events and manage locked accounts across all organizations
            </p>
          </div>
        </div>
      </div>

      {/* Locked Users Across All Orgs */}
      <LockedUsersList />

      {/* Auth Events Across All Orgs */}
      <AuthEventsTable showFilters={true} />
    </div>
  );
}

