import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, ScrollText, Activity } from "lucide-react";
import { UserManagementTab } from "@/components/settings/UserManagementTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RolesPermissionsModule } from "@/components/admin/access-control/rbac/RolesPermissionsModule";

const PlaceholderTab = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground text-sm">{description}</p>
    </CardContent>
  </Card>
);

export const SystemSettingsSection = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users, roles, permissions, and system activity.
        </p>
      </div>

      <Tabs defaultValue="user-management" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="user-management" className="gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="roles-permissions" className="gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="system-logs" className="gap-2 text-xs sm:text-sm">
            <ScrollText className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="gap-2 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-management">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="roles-permissions">
          <RolesPermissionsModule />
        </TabsContent>

        <TabsContent value="system-logs">
          <PlaceholderTab
            title="System Logs"
            description="View system-level logs including database changes, function calls, and error events. Coming soon."
          />
        </TabsContent>

        <TabsContent value="activity-logs">
          <PlaceholderTab
            title="Activity Logs"
            description="Audit trail of all user actions including logins, data changes, and administrative operations. Coming soon."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
