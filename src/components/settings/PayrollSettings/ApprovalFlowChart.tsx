import { ApprovalWorkflowStep, APPROVER_TYPE_META, ApproverType } from "@/lib/types/workflow";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface ApprovalFlowChartProps {
  steps: Partial<ApprovalWorkflowStep>[];
}

const getStepLabel = (step: Partial<ApprovalWorkflowStep>): { label: string; resolvable: boolean } => {
  const type = step.approver_type || 'role';

  if (type === 'individual') {
    if (step.approver_user) {
      return { label: `${step.approver_user.first_name} ${step.approver_user.last_name}`, resolvable: true };
    }
    return { label: step.approver_user_id ? 'User' : 'Unassigned', resolvable: !!step.approver_user_id };
  }

  if (type === 'role' && step.approver_role) {
    const role = roleCatalog[step.approver_role as RoleKey];
    return { label: role?.label || step.approver_role, resolvable: true };
  }

  if (type === 'reporting_to') return { label: 'Reporting Manager', resolvable: true };
  if (type === 'department_head') return { label: 'Department Head', resolvable: true };
  if (type === 'project_manager') return { label: 'Project Manager', resolvable: true };
  if (type === 'designation') return { label: 'By Designation', resolvable: !!step.approver_designation_id };
  if (type === 'group') return { label: 'Approval Group', resolvable: !!step.approver_group_id };

  const meta = APPROVER_TYPE_META[type as ApproverType];
  return { label: meta?.label || type, resolvable: false };
};

export const ApprovalFlowChart = ({ steps }: ApprovalFlowChartProps) => {
  if (steps.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Add approver steps to see the flow preview.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap py-3 px-2">
      {/* Submit node */}
      <div className="flex items-center gap-1">
        <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          Submitted
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Step nodes */}
      {steps.map((step, i) => {
        const { label, resolvable } = getStepLabel(step);
        const type = step.approver_type || 'role';
        const meta = APPROVER_TYPE_META[type as ApproverType];

        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              resolvable
                ? 'bg-card border-border text-foreground'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <span>{meta?.icon || '👤'}</span>
              <span className="font-semibold">L{step.level}</span>
              <span className="max-w-[120px] truncate">{label}</span>
              {!resolvable && <AlertTriangle className="h-3 w-3 text-amber-500" />}
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}

      {/* Approved node */}
      <div className="flex items-center gap-1">
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </div>
      </div>

      {/* Rejected branch */}
      <div className="ml-2 flex items-center gap-1">
        <div className="w-px h-4 bg-border" />
        <div className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </div>
      </div>
    </div>
  );
};
