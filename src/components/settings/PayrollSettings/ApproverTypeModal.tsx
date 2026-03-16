import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ApproverType, APPROVER_TYPE_META } from "@/lib/types/workflow";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";

const APPROVER_ROLE_GROUPS: { label: string; roles: RoleKey[] }[] = [
  { label: "Administration & Finance", roles: ["ORG_OWNER", "ORG_ADMIN", "ORG_FINANCE_APPROVER"] },
  { label: "Payroll", roles: ["ORG_PAYROLL_ADMIN", "ORG_HEAD_OFFICE_PAYROLL"] },
  { label: "Hierarchy", roles: ["ORG_REPORTING_MANAGER", "ORG_DEPARTMENT_HEAD", "ORG_PROJECT_MANAGER"] },
];

interface ApproverTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onAdd: (step: {
    approver_type: ApproverType;
    approver_role?: string;
    approver_user_id?: string;
    approver_designation_id?: string;
    approver_department_id?: string;
    approver_group_id?: string;
  }) => void;
}

export const ApproverTypeModal = ({ open, onOpenChange, organizationId, onAdd }: ApproverTypeModalProps) => {
  const [approverType, setApproverType] = useState<ApproverType>("role");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Data for dropdowns
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; first_name: string; last_name: string; email: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !organizationId) return;
    // Load data
    Promise.all([
      (supabase as any).from("designations").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
      (supabase as any).from("company_units").select("id, name").eq("active", true),
      (supabase as any).from("approval_groups").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
    ]).then(([desRes, deptRes, grpRes]) => {
      setDesignations(desRes.data || []);
      setDepartments(deptRes.data || []);
      setGroups(grpRes.data || []);
    });
  }, [open, organizationId]);

  // User search
  useEffect(() => {
    if (!userSearch.trim() || approverType !== "individual") {
      setUserOptions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await (supabase as any)
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organizationId)
        .or(`first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);
      setUserOptions(data || []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, organizationId, approverType]);

  const resetState = () => {
    setApproverType("role");
    setSelectedRole("");
    setSelectedUserId("");
    setSelectedDesignationId("");
    setSelectedDepartmentId("");
    setSelectedGroupId("");
    setUserSearch("");
    setUserOptions([]);
    setSelectedUser(null);
  };

  const canSave = () => {
    switch (approverType) {
      case "role": return !!selectedRole;
      case "individual": return !!selectedUser;
      case "reporting_to": return true;
      case "department_head": return !!selectedDepartmentId;
      case "department_members": return !!selectedDepartmentId;
      case "designation": return !!selectedDesignationId;
      case "project_manager": return true;
      case "group": return !!selectedGroupId;
      default: return false;
    }
  };

  const handleAdd = () => {
    setSaving(true);
    try {
      onAdd({
        approver_type: approverType,
        approver_role: approverType === "role" ? selectedRole : undefined,
        approver_user_id: approverType === "individual" ? selectedUser?.id : undefined,
        approver_designation_id: approverType === "designation" ? selectedDesignationId : undefined,
        approver_department_id: (approverType === "department_head" || approverType === "department_members") ? selectedDepartmentId : undefined,
        approver_group_id: approverType === "group" ? selectedGroupId : undefined,
      });
      resetState();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const meta = APPROVER_TYPE_META[approverType];
  const availableTypes: ApproverType[] = ["role", "individual", "reporting_to", "department_head", "designation", "project_manager", "group"];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Approver</DialogTitle>
          <DialogDescription>
            Choose an approver type and configure the assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approver Type</Label>
            <Select value={approverType} onValueChange={(v) => { setApproverType(v as ApproverType); setSelectedRole(""); setSelectedUser(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span>{APPROVER_TYPE_META[t].icon}</span>
                      <span>{APPROVER_TYPE_META[t].label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md border">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>

          {/* Context-sensitive sub-fields */}
          {approverType === "role" && (
            <div className="space-y-2">
              <Label>Select Role</Label>
              <div className="border rounded-md max-h-52 overflow-y-auto">
                {APPROVER_ROLE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                      {group.label}
                    </div>
                    {group.roles.map((roleKey) => {
                      const role = roleCatalog[roleKey];
                      const isSelected = selectedRole === roleKey;
                      return (
                        <button
                          key={roleKey}
                          className={`w-full text-left px-3 py-2.5 transition-colors text-sm border-b last:border-b-0 ${isSelected ? "bg-primary/10" : "hover:bg-muted"}`}
                          onClick={() => setSelectedRole(roleKey)}
                        >
                          <p className="font-medium">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {approverType === "individual" && (
            <div className="space-y-2">
              <Label>Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Name or email…" className="pl-9" value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }} />
              </div>
              {searchLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</div>}
              {userOptions.length > 0 && !selectedUser && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {userOptions.map(u => (
                    <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => { setSelectedUser(u); setUserSearch(`${u.first_name || ''} ${u.last_name || ''}`.trim()); setUserOptions([]); }}>
                      <p className="font-medium">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
                  <div className="text-sm flex-1">
                    <p className="font-medium">{[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(" ")}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setUserSearch(""); }}>Change</Button>
                </div>
              )}
            </div>
          )}

          {(approverType === "department_head" || approverType === "department_members") && (
            <div className="space-y-1.5">
              <Label>Select Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Choose department…" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {approverType === "designation" && (
            <div className="space-y-1.5">
              <Label>Select Designation</Label>
              <Select value={selectedDesignationId} onValueChange={setSelectedDesignationId}>
                <SelectTrigger><SelectValue placeholder="Choose designation…" /></SelectTrigger>
                <SelectContent>
                  {designations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {approverType === "group" && (
            <div className="space-y-1.5">
              <Label>Select Approval Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger><SelectValue placeholder="Choose group…" /></SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No groups created yet</div>
                  ) : groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(approverType === "reporting_to" || approverType === "project_manager") && (
            <div className="p-3 bg-accent/50 border border-accent rounded-md">
              <p className="text-xs text-accent-foreground">
                {approverType === "reporting_to"
                  ? "This will resolve to each employee's direct manager (reports_to_id) when the pay run is submitted."
                  : "This will resolve to the project's responsible manager when the pay run is submitted."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !canSave()} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Approver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
