// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { workflowService } from "@/lib/services/workflow.service";
import {
  ApprovalWorkflowCriteria,
  CriteriaField,
  CriteriaOperator,
  CRITERIA_FIELD_LABELS,
  CRITERIA_OPERATORS,
} from "@/lib/types/workflow";

interface ApprovalCriteriaBuilderProps {
  workflowId: string;
  organizationId: string;
}

export const ApprovalCriteriaBuilder = ({ workflowId, organizationId }: ApprovalCriteriaBuilderProps) => {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<Partial<ApprovalWorkflowCriteria>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lookup data
  const [payGroups, setPayGroups] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [workflowId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [existingCriteria, pgRes, catRes, deptRes, desRes, usersRes, rolesRes] = await Promise.all([
        workflowService.getCriteria(workflowId),
        (supabase as any).from("pay_group_master").select("id, name").eq("is_active", true),
        (supabase as any).from("employee_categories").select("id, label").eq("organization_id", organizationId).eq("active", true),
        (supabase as any).from("company_units").select("id, name").eq("active", true),
        (supabase as any).from("designations").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
        (supabase as any).from("user_profiles").select("id, first_name, last_name"),
        (supabase as any).from("rbac_roles").select("code, name").not("tier", "eq", "PLATFORM"),
      ]);
      setCriteria(existingCriteria.length > 0 ? existingCriteria : []);
      setPayGroups(pgRes.data || []);
      setCategories(catRes.data || []);
      setDepartments(deptRes.data || []);
      setDesignations(desRes.data || []);
      setUsers((usersRes.data || []).map((u: any) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() })));
      setRoles(rolesRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addCondition = () => {
    setCriteria([...criteria, { field: 'amount', operator: 'greater_than', value: [], sequence_number: criteria.length }]);
  };

  const removeCondition = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<ApprovalWorkflowCriteria>) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    // Reset operator and value when field changes
    if (updates.field) {
      const ops = CRITERIA_OPERATORS[updates.field as CriteriaField];
      newCriteria[index].operator = ops?.[0]?.value || 'equals';
      newCriteria[index].value = updates.field === 'amount' ? [] : [];
    }
    setCriteria(newCriteria);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await workflowService.saveCriteria(workflowId, criteria.map((c, i) => ({
        field: c.field as CriteriaField,
        operator: c.operator as CriteriaOperator,
        value: c.value || [],
        sequence_number: i,
      })));
      toast({ title: "Criteria saved" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save criteria", variant: "destructive" });
    }
    setSaving(false);
  };

  const getValueOptions = (field: CriteriaField) => {
    switch (field) {
      case 'pay_group': return payGroups.map(p => ({ value: p.id, label: p.name }));
      case 'employee_category': return categories.map(c => ({ value: c.id, label: c.label }));
      case 'department': return departments.map(d => ({ value: d.id, label: d.name }));
      case 'designation': return designations.map(d => ({ value: d.id, label: d.name }));
      case 'payrun_type': return [
        { value: 'Regular', label: 'Regular' },
        { value: 'Bonus', label: 'Bonus' },
        { value: 'Adjustment', label: 'Adjustment' },
        { value: 'Rerun', label: 'Rerun' },
      ];
      case 'creator_user':
      case 'submitter_user': return users.map(u => ({ value: u.id, label: u.name }));
      case 'creator_designation':
      case 'submitter_designation': return designations.map(d => ({ value: d.id, label: d.name }));
      case 'creator_department':
      case 'submitter_department': return departments.map(d => ({ value: d.id, label: d.name }));
      case 'creator_role':
      case 'submitter_role': return roles.map(r => ({ value: r.code, label: r.name }));
      default: return [];
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading criteria…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Workflow Criteria
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define conditions that determine when this workflow is used. All conditions must match (AND logic).
          </p>
        </div>
      </div>

      {criteria.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">No criteria defined. This workflow will match based on category assignment only.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" /> Add Condition
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {criteria.map((c, index) => {
            const field = c.field as CriteriaField;
            const operators = CRITERIA_OPERATORS[field] || [];
            const isAmountField = field === 'amount';
            const valueOptions = getValueOptions(field);

            return (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                {/* Field */}
                <Select value={field} onValueChange={(v) => updateCondition(index, { field: v as CriteriaField })}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CRITERIA_FIELD_LABELS) as CriteriaField[]).map(f => (
                      <SelectItem key={f} value={f}>{CRITERIA_FIELD_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator */}
                <Select value={c.operator} onValueChange={(v) => updateCondition(index, { operator: v as CriteriaOperator })}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value */}
                <div className="flex-1">
                  {isAmountField ? (
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      placeholder="Enter amount"
                      value={Array.isArray(c.value) && c.value.length > 0 ? c.value[0] : ''}
                      onChange={(e) => updateCondition(index, { value: [e.target.value] })}
                    />
                  ) : (
                    <Select value={Array.isArray(c.value) ? c.value[0] || '' : ''} onValueChange={(v) => updateCondition(index, { value: [v] })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {valueOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Remove */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(index)}>
                  <X className="h-4 w-4" />
                </Button>

                {/* AND label */}
                {index < criteria.length - 1 && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">AND</Badge>
                )}
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" /> Add Condition
          </Button>
        </div>
      )}

      {criteria.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Criteria
          </Button>
        </div>
      )}
    </div>
  );
};
