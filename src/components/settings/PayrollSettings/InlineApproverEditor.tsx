// @ts-nocheck
import { useState, useEffect } from "react";
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
import { Trash2, Loader2, Search, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ApproverType, APPROVER_TYPE_META, ApprovalWorkflowStep } from "@/lib/types/workflow";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";

const APPROVER_ROLE_GROUPS: { label: string; roles: RoleKey[] }[] = [
  { label: "Administration & Finance", roles: ["ORG_OWNER", "ORG_ADMIN", "ORG_FINANCE_APPROVER"] },
  { label: "Payroll", roles: ["ORG_PAYROLL_ADMIN", "ORG_HEAD_OFFICE_PAYROLL"] },
  { label: "Hierarchy", roles: ["ORG_REPORTING_MANAGER", "ORG_DEPARTMENT_HEAD", "ORG_PROJECT_MANAGER"] },
];

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
  const [userSearches, setUserSearches] = useState<Record<number, string>>({});
  const [userResults, setUserResults] = useState<Record<number, any[]>>({});
  const [searchLoading, setSearchLoading] = useState<Record<number, boolean>>({});

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
  }, [organizationId]);

  const searchUser = (index: number, query: string) => {
    setUserSearches(prev => ({ ...prev, [index]: query }));
    if (!query.trim()) {
      setUserResults(prev => ({ ...prev, [index]: [] }));
      return;
    }
    setSearchLoading(prev => ({ ...prev, [index]: true }));
    const timeout = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organizationId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      setUserResults(prev => ({ ...prev, [index]: data || [] }));
      setSearchLoading(prev => ({ ...prev, [index]: false }));
    }, 300);
    return () => clearTimeout(timeout);
  };

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
    // Reset sub-fields when type changes
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

  const selectUser = (index: number, user: any) => {
    updateStep(index, {
      approver_user_id: user.id,
      approver_user: { first_name: user.first_name, last_name: user.last_name, email: user.email },
    });
    setUserSearches(prev => ({ ...prev, [index]: `${user.first_name || ''} ${user.last_name || ''}`.trim() }));
    setUserResults(prev => ({ ...prev, [index]: [] }));
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

  // Flow preview text
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
              <div className="ml-8 space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search user by name or email…"
                    className="h-8 text-xs pl-8"
                    value={userSearches[index] || ''}
                    onChange={(e) => searchUser(index, e.target.value)}
                  />
                </div>
                {searchLoading[index] && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </div>
                )}
                {(userResults[index] || []).length > 0 && !step.approver_user_id && (
                  <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                    {userResults[index].map((u: any) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs"
                        onClick={() => selectUser(index, u)}
                      >
                        <p className="font-medium">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</p>
                        {u.email && <p className="text-[10px] text-muted-foreground">{u.email}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {step.approver_user && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-md border border-primary/20 text-xs">
                    <span className="font-medium flex-1">
                      {step.approver_user.first_name} {step.approver_user.last_name}
                    </span>
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        updateStep(index, { approver_user_id: undefined, approver_user: undefined });
                        setUserSearches(prev => ({ ...prev, [index]: '' }));
                      }}
                    >
                      Change
                    </button>
                  </div>
                )}
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
