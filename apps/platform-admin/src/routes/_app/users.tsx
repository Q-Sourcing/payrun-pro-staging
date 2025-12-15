import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, UserCog, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateUserWizard } from "@/components/users/CreateUserWizard";
import { AddExistingUserDialog } from "@/components/users/AddExistingUserDialog";
import {
  listPlatformAdminDevices,
  listPlatformAdmins,
  setDeviceApproval,
  upsertPlatformAdmin,
} from "@/api/platformAdmins";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"super_admin" | "support_admin" | "compliance" | "billing">("support_admin");
  const [allowed, setAllowed] = useState(true);

  // New state for modals
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);

  const { data: admins, isLoading: adminsLoading, error: adminsError } = useQuery({
    queryKey: ["platform-admins"],
    queryFn: listPlatformAdmins,
  });

  const { data: devices, isLoading: devicesLoading, error: devicesError } = useQuery({
    queryKey: ["platform-admin-devices"],
    queryFn: listPlatformAdminDevices,
  });

  const createOrUpdateAdmin = useMutation({
    mutationFn: () => upsertPlatformAdmin({ email, full_name: fullName, role, allowed }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["platform-admins"] });
      setEmail("");
      setFullName("");
      setRole("support_admin");
      setAllowed(true);
    },
  });

  const approveDevice = useMutation({
    mutationFn: ({ deviceId, approved }: { deviceId: string; approved: boolean }) =>
      setDeviceApproval(deviceId, approved),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["platform-admin-devices"] });
    },
  });

  const sortedDevices = useMemo(() => devices ?? [], [devices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Admin Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform-level admins stored in the `platform_admins` table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateWizardOpen(true)}>
                Create New User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddExistingOpen(true)}>
                Add Existing User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CreateUserWizard open={createWizardOpen} onOpenChange={setCreateWizardOpen} />
        <AddExistingUserDialog open={addExistingOpen} onOpenChange={setAddExistingOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New / Update Admin</CardTitle>
          <CardDescription>Creates or updates a row in `platform_admins` (by email).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="admin@payrunpro.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              placeholder="super_admin | support_admin | compliance | billing"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Allowed</span>
              <Switch checked={allowed} onCheckedChange={setAllowed} />
            </div>
          </div>
          <Button
            className="md:col-span-2"
            disabled={!email || createOrUpdateAdmin.isPending}
            onClick={() => createOrUpdateAdmin.mutate()}
          >
            {createOrUpdateAdmin.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Existing Admins</CardTitle>
            <CardDescription>Real data from `platform_admins`.</CardDescription>
          </div>
          <Shield className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {(adminsError as Error | null)?.message && (
            <p className="mb-3 text-sm text-destructive">{(adminsError as Error).message}</p>
          )}
          {adminsLoading ? (
            <p className="text-sm text-muted-foreground">Loading admins...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Allowed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(admins ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm">
                      No platform admins found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (admins ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.email}</TableCell>
                      <TableCell>{a.full_name ?? "--"}</TableCell>
                      <TableCell>{a.role}</TableCell>
                      <TableCell>{a.allowed ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Approvals</CardTitle>
          <CardDescription>Approve or deny registered devices in `platform_admin_devices`.</CardDescription>
        </CardHeader>
        <CardContent>
          {(devicesError as Error | null)?.message && (
            <p className="mb-3 text-sm text-destructive">{(devicesError as Error).message}</p>
          )}
          {devicesLoading ? (
            <p className="text-sm text-muted-foreground">Loading devices...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm">
                      No devices registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDevices.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.platform_admins?.email ?? d.admin_id}
                        <div className="text-xs text-muted-foreground">{d.platform_admins?.role ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{d.device_name ?? "--"}</div>
                        <div className="text-xs text-muted-foreground">{d.device_id}</div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.approved}
                          onCheckedChange={(checked) =>
                            approveDevice.mutate({ deviceId: d.device_id, approved: checked })
                          }
                          disabled={approveDevice.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impersonation Controls</CardTitle>
          <CardDescription>Restrict who can impersonate tenant admins.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <UserCog className="h-4 w-4" />
          Configure permissions and MFA requirements here.
        </CardContent>
      </Card>
    </div>
  );
}



