// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Loader2, Search, Bell, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ApproverType, APPROVER_TYPE_META, ApprovalWorkflowStep } from "@/lib/types/workflow";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";

const MANAGE_USERS_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

const APPROVER_ROLE_GROUPS: { label: string; roles: RoleKey[] }[] = [
  { label: "Administration & Finance", roles: ["ORG_OWNER", "ORG_ADMIN", "ORG_FINANCE_APPROVER"] },
  { label: "Payroll", roles: ["ORG_PAYROLL_ADMIN", "ORG_HEAD_OFFICE_PAYROLL"] },
  { label: "Hierarchy", roles: ["ORG_REPORTING_MANAGER", "ORG_DEPARTMENT_HEAD", "ORG_PROJECT_MANAGER"] },
];

interface UserOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  full_name?: string;
}

interface InlineApproverEditorProps {
  organizationId: string;
  steps: Partial<ApprovalWorkflowStep>[];
  onStepsChange: (steps: Partial<ApprovalWorkflowStep>[]) => void;
  followup: {
    enabled: boolean;
    type: 'one_time' | 'repeat';
    daysAfter: number;
    repeatInterval: number;
    sendAt: string;
  };
  onFollowupChange: (followup: InlineApproverEditorProps['followup']) => void;
}

/** User combobox: shows all users in a searchable dropdown */
function UserCombobox({
  allUsers,
  usersLoading,
  selectedUserId,
  selectedUser,
  onSelect,
  onClear,
}: {
  allUsers: UserOption[];
  usersLoading: boolean;
  selectedUserId?: string;
  selectedUser?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  onSelect: (user: UserOption) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.trim()
    ? allUsers.filter(u => {
        const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
        return name.includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
      })
    : allUsers;

  const selectedName = selectedUser
    ? `${selectedUser.first_name ?? ""} ${selectedUser.last_name ?? ""}`.trim() || selectedUser.email
    : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        className={`w-full flex items-center justify-between h-8 px-3 text-xs rounded-md border bg-background transition-colors ${
          open ? "border-primary ring-1 ring-primary/20" : "border-input hover:border-muted-foreground/50"
        }`}
        onClick={() => {
          setOpen(prev => !prev);
          setSearch("");
        }}
      >
        {selectedName ? (
          <span className="font-medium truncate">{selectedName}</span>
        ) : (
          <span className="text-muted-foreground">Select user…</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search */}
          <div className="flex items-center px-2 py-1.5 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
            <input
              autoFocus
              placeholder="Search by name or email…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto py-1">
            {usersLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading users…
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No users found.</p>
            ) : (
              filtered.map(u => {
                const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-muted transition-colors text-xs ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      onSelect(u);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                    <div className={isSelected ? "" : "pl-5"}>
                      <p className="font-medium">{name}</p>
                      {u.email && <p className="text-[10px] text-muted-foreground">{u.email}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear selection */}
          {selectedUserId && (
            <>
              <div className="border-t" />
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                onClick={() => {
                  onClear();
                  setOpen(false);
                  setSearch("");
                }}
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const InlineApproverEditor = ({
  organizationId,
  steps,
  onStepsChange,
  followup,
  onFollowupChange,
}: InlineApproverEditorProps) => {
  // Lookup data
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      (supabase as any).from("designations").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
      (supabase as any).from("company_units").select("id, name").eq("active", true),
      (supabase as any).from("approval_groups").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
    ]).then(([desRes, deptRes, grpRes]) => {
      setDesignations(desRes.data || []);
      setDepartments(deptRes.data || []);
      setGroups(grpRes.data || []);
    });

    // Load all users via edge function (bypasses RLS)
    setUsersLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(MANAGE_USERS_FN_URL, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      })
    ).then(r => r.json()).then(json => {
      setAllUsers(json.users ?? []);
      setUsersLoading(false);
    }).catch(() => setUsersLoading(false));
  }, [organizationId]);

  const addStep = () => {
    const level = steps.length + 1;
    onStepsChange([...steps, {
      level,
      sequence_number: level,
      approver_type: 'reporting_to',
      notify_email: true,
      notify_in_app: true,
    }]);
  };

  const removeStep = (index: number) => {
    onStepsChange(
      steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1, sequence_number: i + 1 }))
    );
  };

  const updateStep = (index: number, updates: Partial<ApprovalWorkflowStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    if (updates.approver_type) {
      newSteps[index].approver_role = undefined;
      newSteps[index].approver_user_id = undefined;
      newSteps[index].approver_user = undefined;
      newSteps[index].approver_designation_id = undefined;
      newSteps[index].approver_department_id = undefined;
      newSteps[index].approver_group_id = undefined;
    }
    onStepsChange(newSteps);
  };

  const selectUser = (index: number, user: UserOption) => {
    updateStep(index, {
      approver_user_id: user.id,
      approver_user: { first_name: user.first_name, last_name: user.last_name, email: user.email },
    });
  };

  const clearUser = (index: number) => {
    updateStep(index, { approver_user_id: undefined, approver_user: undefined });
  };

  const getStepLabel = (step: Partial<ApprovalWorkflowStep>) => {
    const type = step.approver_type || 'role';
    if (type === 'individual' && step.approver_user) {
      return `${step.approver_user.first_name} ${step.approver_user.last_name}`;
    }
    if (type === 'role' && step.approver_role) {
      const r = roleCatalog[step.approver_role as RoleKey];
      return r?.label || step.approver_role;
    }
    const meta = APPROVER_TYPE_META[type as ApproverType];
    return meta?.label || type;
  };

  const flowPreviewText = steps.length === 0
    ? 'Add approver levels to see the flow.'
    : steps.map((s, i) => `Level ${i + 1}: ${getStepLabel(s)}`).join(' → ');

  return (
    <div className="space-y-4">
      {/* Step rows */}
      {steps.map((step, index) => {
        const type = step.approver_type || 'reporting_to';
        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 w-6">L{step.level}</span>

              {/* Approver Type dropdown */}
              <Select
                value={type}
                onValueChange={(v) => updateStep(index, { approver_type: v as ApproverType })}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">Individual</SelectLabel>
                    <SelectItem value="individual">
                      <span className="flex items-center gap-1.5">🧑 Specific User</span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">By Role</SelectLabel>
                    <SelectItem value="role">
                      <span className="flex items-center gap-1.5">🛡️ By OBAC Role</span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">Hierarchy</SelectLabel>
                    <SelectItem value="reporting_to">
                      <span className="flex items-center gap-1.5">👤 Reporting To</span>
                    </SelectItem>
                    <SelectItem value="department_head">
                      <span className="flex items-center gap-1.5">🏢 Department Head</span>
                    </SelectItem>
                    <SelectItem value="project_manager">
                      <span className="flex items-center gap-1.5">📊 Project Manager</span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">Group</SelectLabel>
                    <SelectItem value="group">
                      <span className="flex items-center gap-1.5">👥 Approval Group</span>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Delete */}
              <button
                onClick={() => removeStep(index)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Inline sub-fields based on type */}
            {type === 'individual' && (
              <div className="ml-8">
                <UserCombobox
                  allUsers={allUsers}
                  usersLoading={usersLoading}
                  selectedUserId={step.approver_user_id}
                  selectedUser={step.approver_user}
                  onSelect={(user) => selectUser(index, user)}
                  onClear={() => clearUser(index)}
                />
              </div>
            )}

            {type === 'role' && (
              <div className="ml-8">
                <Select
                  value={step.approver_role || ''}
                  onValueChange={(v) => updateStep(index, { approver_role: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_ROLE_GROUPS.map(group => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-[10px]">{group.label}</SelectLabel>
                        {group.roles.map(roleKey => {
                          const role = roleCatalog[roleKey];
                          return (
                            <SelectItem key={roleKey} value={roleKey}>
                              {role?.label || roleKey}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(type === 'department_head' || type === 'department_members') && (
              <div className="ml-8">
                <Select
                  value={step.approver_department_id || ''}
                  onValueChange={(v) => updateStep(index, { approver_department_id: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select department…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'designation' && (
              <div className="ml-8">
                <Select
                  value={step.approver_designation_id || ''}
                  onValueChange={(v) => updateStep(index, { approver_designation_id: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select designation…" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'group' && (
              <div className="ml-8">
                <Select
                  value={step.approver_group_id || ''}
                  onValueChange={(v) => updateStep(index, { approver_group_id: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No groups created yet</div>
                    ) : groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(type === 'reporting_to' || type === 'project_manager') && (
              <p className="ml-8 text-[10px] text-muted-foreground italic">
                {type === 'reporting_to'
                  ? "Resolves to each employee's direct manager at submission time."
                  : "Resolves to the project's responsible manager at submission time."}
              </p>
            )}
          </div>
        );
      })}

      {/* Add Approver Level link */}
      <button
        onClick={addStep}
        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        + Add Approver Level
      </button>

      {/* Flow preview pill */}
      <div className="px-3 py-2 bg-muted rounded-md">
        <p className="text-xs text-muted-foreground">
          {steps.length === 0
            ? 'Add approver levels to see the flow.'
            : `${steps.length} Level(s) — ${flowPreviewText}`
          }
        </p>
      </div>

      <Separator />

      {/* Follow-up toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <Label className="text-sm font-medium">Enable follow-up reminders</Label>
          </div>
          <Switch
            checked={followup.enabled}
            onCheckedChange={(v) => onFollowupChange({ ...followup, enabled: v })}
          />
        </div>

        {followup.enabled && (
          <div className="space-y-3 pl-1">
            <RadioGroup
              value={followup.type}
              onValueChange={(v) => onFollowupChange({ ...followup, type: v as 'one_time' | 'repeat' })}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="one_time" id="fu-once" />
                <Label htmlFor="fu-once" className="cursor-pointer text-xs">One time</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="repeat" id="fu-repeat" />
                <Label htmlFor="fu-repeat" className="cursor-pointer text-xs">Repeat</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">After</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={followup.daysAfter}
                onChange={e => onFollowupChange({ ...followup, daysAfter: Number(e.target.value) })}
                className="w-16 h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground">day(s) of inactivity</span>
            </div>

            {followup.type === 'repeat' && (
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Every</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={followup.repeatInterval}
                  onChange={e => onFollowupChange({ ...followup, repeatInterval: Number(e.target.value) })}
                  className="w-16 h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">day(s)</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Send at</Label>
              <Input
                type="time"
                value={followup.sendAt}
                onChange={e => onFollowupChange({ ...followup, sendAt: e.target.value })}
                className="w-28 h-7 text-xs"
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              {followup.type === 'repeat'
                ? `Approvers will be reminded after ${followup.daysAfter} day(s), then every ${followup.repeatInterval} day(s).`
                : `Approvers will receive a one-time reminder after ${followup.daysAfter} day(s) of inactivity.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
