// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
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

interface InlineCriteriaEditorProps {
  workflowId?: string | null;
  organizationId: string;
  criteria: Partial<ApprovalWorkflowCriteria>[];
  onChange: (criteria: Partial<ApprovalWorkflowCriteria>[]) => void;
}

export const InlineCriteriaEditor = ({
  workflowId,
  organizationId,
  criteria,
  onChange,
}: InlineCriteriaEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [payGroups, setPayGroups] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadLookups();
  }, [organizationId]);

  // Load persisted criteria when workflowId becomes available
  useEffect(() => {
    if (!workflowId) return;
    const loadExisting = async () => {
      try {
        const existing = await workflowService.getCriteria(workflowId);
        if (existing.length > 0) {
          onChange(existing);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadExisting();
  }, [workflowId]);

  const loadLookups = async () => {
    setLoading(true);
    try {
      const [pgRes, catRes, deptRes, desRes] = await Promise.all([
        (supabase as any).from("pay_group_master").select("id, name").eq("active", true),
        (supabase as any).from("employee_categories").select("id, label").eq("organization_id", organizationId).eq("active", true),
        (supabase as any).from("company_units").select("id, name").eq("active", true),
        (supabase as any).from("designations").select("id, name").eq("organization_id", organizationId).eq("is_active", true),
      ]);
      setPayGroups(pgRes.data || []);
      setCategories(catRes.data || []);
      setDepartments(deptRes.data || []);
      setDesignations(desRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addCondition = () => {
    onChange([...criteria, { field: 'amount', operator: 'greater_than', value: [], sequence_number: criteria.length }]);
  };

  const removeCondition = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<ApprovalWorkflowCriteria>) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    if (updates.field) {
      const ops = CRITERIA_OPERATORS[updates.field as CriteriaField];
      newCriteria[index].operator = ops?.[0]?.value || 'equals';
      newCriteria[index].value = [];
    }
    onChange(newCriteria);
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
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          No criteria defined. This workflow will match based on category assignment only.
        </p>
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Condition
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {criteria.map((c, index) => {
        const field = c.field as CriteriaField;
        const operators = CRITERIA_OPERATORS[field] || [];
        const isAmountField = field === 'amount';
        const valueOptions = getValueOptions(field);

        return (
          <div key={index}>
            <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-card">
              <Select value={field} onValueChange={(v) => updateCondition(index, { field: v as CriteriaField })}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CRITERIA_FIELD_LABELS) as CriteriaField[]).map(f => (
                    <SelectItem key={f} value={f}>{CRITERIA_FIELD_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={c.operator} onValueChange={(v) => updateCondition(index, { operator: v as CriteriaOperator })}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              <button
                onClick={() => removeCondition(index)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {index < criteria.length - 1 && (
              <div className="flex justify-center py-1">
                <Badge variant="secondary" className="text-[10px]">AND</Badge>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={addCondition}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          + Add Condition
        </button>
        {criteria.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
