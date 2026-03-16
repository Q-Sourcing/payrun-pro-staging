

# Complete 6-Phase Approval System Overhaul — Implementation Plan

This plan covers all 6 phases plus the unified WorkflowBuilder UI, implementing the full Zoho People-parity approval system.

---

## Database Migration (Single Large Migration)

One migration covering all schema changes across phases 1-6:

**Phase 1 — Bug Fixes + Metadata**: `updated_by` column already exists on `approval_workflows` (migration `20260316145110`). No additional schema changes needed.

**Phase 3 — Approver Types**:
- `ALTER TABLE employees ADD COLUMN IF NOT EXISTS reports_to_id uuid REFERENCES employees(id)`
- `ALTER TABLE company_units ADD COLUMN IF NOT EXISTS head_user_id uuid REFERENCES auth.users(id)`
- `CREATE TABLE approval_groups` (id, organization_id, name, description, is_active, created_at, updated_at)
- `CREATE TABLE approval_group_members` (id, group_id FK, user_id FK, created_at)
- `ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS approver_designation_id uuid`, `approver_department_id uuid`, `approver_group_id uuid`
- Update `approver_type` to support: `reporting_to`, `role`, `department_head`, `department_members`, `designation`, `individual`, `project_manager`, `group`

**Phase 4 — Criteria**:
- `CREATE TABLE approval_workflow_criteria` (id, workflow_id FK CASCADE, field text, operator text, value jsonb, sequence_number int, created_at)

**Phase 5 — Follow-ups**:
- `CREATE TABLE approval_workflow_followups` (id, workflow_id FK CASCADE, is_enabled boolean, followup_type text, days_after int, repeat_interval_days int, send_at_time time, created_at, updated_at)

**Phase 6 — Messages**:
- `CREATE TABLE approval_workflow_messages` (id, workflow_id FK CASCADE, event_type text, from_type text, to_type text, subject text, body_content text, is_active boolean, created_at, updated_at)

RLS policies for all new tables scoped to authenticated users within the same organization.

---

## Phase 1: Bug Fixes + Workflow Metadata

**handleSave fix** in `ApproversSection.tsx`: Already fixed — the current code has try/catch/finally with `setSaving(false)` in finally block (lines 396-429). Confirmed working.

**Creator/Editor display**: Already implemented — `fetchWorkflowMeta` resolves `created_by` and `updated_by` names and displays them in the card header (lines 182-217, 472-485). No changes needed.

Phase 1 is already complete.

---

## Phase 2: Designations

**Already implemented**:
- `designations` table exists (migration `20260316150114`)
- `DesignationsManager.tsx` exists with full CRUD
- `EmployeeForm.tsx` already refactored to use designation dropdown
- `OrganizationSetupModal.tsx` wired to DesignationsManager

Phase 2 is already complete.

---

## Phase 3: Full Approver Type System

### Schema (in migration above)

### RPC Update: `submit_payrun_for_approval`
Replace or create a new version that handles all approver types:
- `reporting_to` → look up `employees.reports_to_id` for each employee in the pay run, resolve their manager's `user_id`
- `department_head` → look up `company_units.head_user_id` for the employee's `company_unit_id`
- `department_members` → all `org_users` whose employees belong to the same `company_unit_id`
- `designation` → all employees with matching `designation_id`, get their linked `user_id`
- `project_manager` → `projects.responsible_manager_id` for the pay run's associated project
- `group` → all users in `approval_group_members` for the step's `approver_group_id`
- `role` and `individual` → unchanged (already working)

### UI: Refactored Add Approver Modal
Replace the current modal in both `ApproversSection.tsx` and `WorkflowBuilder.tsx` with a type-first selector:

```text
┌──────────────────────────────────┐
│ Add Approver                     │
├──────────────────────────────────┤
│ Type: [▼ Reporting Manager     ] │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ℹ Resolves to the employee's │ │
│ │   direct manager at runtime  │ │
│ └──────────────────────────────┘ │
│                                  │
│         [Cancel] [Add]           │
└──────────────────────────────────┘
```

Context-sensitive sub-fields appear based on type selection (department picker for `department_head`, user search for `individual`, etc.).

### Files Modified
- `src/components/settings/ApproversSection.tsx` — new modal UI
- `src/components/settings/PayrollSettings/WorkflowBuilder.tsx` — same modal refactor
- `src/lib/types/workflow.ts` — extend `ApproverType` union
- New migration SQL — schema + RPC update
- `src/lib/services/workflow.service.ts` — update step insert/update to include new fields

---

## Phase 4: Criteria Builder

### New Component: `ApprovalCriteriaBuilder.tsx`
Condition rows with field/operator/value pattern:

```text
┌─────────────────────────────────────────────────┐
│ Criteria (AND logic)                            │
├─────────────────────────────────────────────────┤
│ [Amount ▼] [greater_than ▼] [500000    ] [×]   │
│ [Category ▼] [in ▼]        [Head Office] [×]   │
│                                                 │
│ [+ Add Condition]                               │
│                                                 │
│ ── Test Preview ──                              │
│ [Select a pay run...] [Test]                    │
│ ✓ Matches: amount > 500,000 AND category in ... │
└─────────────────────────────────────────────────┘
```

Field-specific operators and value pickers:
- `amount` → number input with `greater_than`/`less_than`/`equals`
- `pay_group` → multi-select from org's pay groups
- `employee_category` → multi-select from `employee_categories`
- `department` → multi-select from `company_units`
- `designation` → multi-select from `designations`
- `payrun_type` → multi-select (Regular, Bonus, Adjustment, Rerun)

### RPC Update
In `submit_payrun_for_approval`, before selecting a workflow:
1. Fetch all active workflows with criteria
2. Evaluate each workflow's criteria against the pay run (AND logic)
3. Rank by specificity (more criteria rows = higher priority)
4. Fall back to default workflow, then auto-approve

### Files
- New: `src/components/settings/PayrollSettings/ApprovalCriteriaBuilder.tsx`
- Modified: `src/lib/services/workflow.service.ts` — CRUD for criteria
- Modified: RPC in migration

---

## Phase 5: Per-Workflow Follow-ups

### New Component: `ApprovalFollowupConfig.tsx`

```text
┌───────────────────────────────────────────┐
│ Follow-up Settings                        │
├───────────────────────────────────────────┤
│ [✓] Send follow-up to approvers           │
│                                           │
│ ○ One time  ● Repeat                      │
│ Send after [2] days of inactivity         │
│ Repeat every [1] day(s)                   │
│ Send at [09:00]                           │
│                                           │
│ Preview: "Approvers will be reminded      │
│ after 2 days, then every 1 day until      │
│ actioned."                                │
└───────────────────────────────────────────┘
```

### Edge Function Update: `check-reminders/index.ts`
In the approval reminder section:
1. For each pending step, look up the step's workflow_id via `payrun_approval_steps → approval_workflow_steps.workflow_id`
2. Query `approval_workflow_followups` for that workflow
3. Apply per-workflow intervals; fall back to global `reminder_rules` if none exist
4. For repeat: track reminder count in notification metadata to cap at 10

### Files
- New: `src/components/settings/PayrollSettings/ApprovalFollowupConfig.tsx`
- Modified: `supabase/functions/check-reminders/index.ts`
- Modified: `src/lib/services/workflow.service.ts` — CRUD for followups

---

## Phase 6: Per-Workflow Email Templates

### New Component: `ApprovalWorkflowMessages.tsx`

```text
┌──────────────────────────────────────────────┐
│ [Submitted] [Approved] [Rejected] [Reminder] │
├──────────────────────────────────────────────┤
│ From: [System ▼]                             │
│ To:   [Current Approver ▼]                   │
│                                              │
│ Subject: Payrun {{pay_period}} needs review  │
│                                              │
│ Body:                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ Hi {{approver_name}},                    │ │
│ │ A payrun for {{pay_period}} totaling     │ │
│ │ {{total_gross}} requires your approval.  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Variables: [{{total_gross}}] [{{pay_period}}] │
│            [{{approver_name}}] [{{org_name}}] │
│                                              │
│ ── Live Preview ──                           │
│ Subject: Payrun Jan 2026 needs review        │
│ Body: Hi John Doe, A payrun for Jan 2026...  │
│                                              │
│ [Reset to default]              [Save]       │
└──────────────────────────────────────────────┘
```

### Edge Function Update: `trigger-approval-email/index.ts`
Before queuing email:
1. Look up the pay run's workflow_id (from `payrun_approval_steps` or `pay_runs`)
2. Query `approval_workflow_messages` for (workflow_id, event_type)
3. If found and `is_active`, use that template's subject/body with variable substitution
4. Otherwise fall back to global `notification_templates`

### Files
- New: `src/components/settings/PayrollSettings/ApprovalWorkflowMessages.tsx`
- Modified: `supabase/functions/trigger-approval-email/index.ts`
- Modified: `src/lib/services/workflow.service.ts` — CRUD for messages

---

## Unified WorkflowBuilder UI

### Layout Refactor: `WorkflowBuilder.tsx`

Complete rewrite with left panel + right panel + 4 tabs:

```text
┌──────────────────┬────────────────────────────────────┐
│ WORKFLOWS        │ [Approvers] [Criteria] [Follow-up] │
│                  │ [Messages]                         │
│ ┌──────────────┐ │                                    │
│ │ Standard ✓   │ │ ┌────────────────────────────────┐ │
│ │ 3 steps      │ │ │ Workflow Name: [Standard     ] │ │
│ │ Active ●     │ │ │ Description: [optional...    ] │ │
│ │ Default ★    │ │ │                                │ │
│ └──────────────┘ │ │ ── Approval Chain ──           │ │
│                  │ │ ☰ L1 │ 👤 Finance Officer     │ │
│ ┌──────────────┐ │ │ ☰ L2 │ 🏢 Department Head     │ │
│ │ High Value   │ │ │ ☰ L3 │ 👑 Org Owner           │ │
│ │ 2 steps      │ │ │                                │ │
│ │ Inactive ○   │ │ │ [+ Add Approver]               │ │
│ └──────────────┘ │ │                                │ │
│                  │ │ ── Flow Preview ──             │ │
│ [+ Add Workflow] │ │ Submit → L1 → L2 → L3 → ✓    │ │
│                  │ │                    ↓           │ │
│                  │ │                  Rejected      │ │
│                  │ └────────────────────────────────┘ │
└──────────────────┴────────────────────────────────────┘
```

### Left Panel Features
- Workflow cards with name, step count, active/inactive badge, default badge
- Three-dot menu: Set as Default, Duplicate, Delete
- Inline rename on click
- "Add Workflow" button

### Right Panel Tabs
- **Approvers**: Step chain with drag handles, type icons, resolution preview, live flowchart
- **Criteria**: `ApprovalCriteriaBuilder` (Phase 4)
- **Follow-up**: `ApprovalFollowupConfig` (Phase 5)
- **Messages**: `ApprovalWorkflowMessages` (Phase 6)

### Live Flowchart
Horizontal pill chain rendered with simple div-based nodes:
- `Submitted` → `Level 1` → `Level 2` → ... → `Approved`
- Branch downward for `Rejected`
- Nodes show level number, approver name/role, type icon
- Unresolvable nodes in amber with warning icon
- Re-renders on step changes without page reload

### Files
- Rewrite: `src/components/settings/PayrollSettings/WorkflowBuilder.tsx`
- Modified: `src/components/settings/PayrollSettings/ApprovalWorkflows.tsx` — integrate new left-panel layout
- Modified: `src/components/settings/ApproversSection.tsx` — link to unified builder

---

## Implementation Order

1. **Migration** — single SQL migration with all tables/columns
2. **Types + Service layer** — update `workflow.ts` types, extend `workflow.service.ts` with CRUD for criteria, followups, messages
3. **Phase 3 UI** — approver type modal refactor
4. **Phase 4 UI** — `ApprovalCriteriaBuilder`
5. **Phase 5 UI** — `ApprovalFollowupConfig`
6. **Phase 6 UI** — `ApprovalWorkflowMessages`
7. **Unified WorkflowBuilder** — rewrite with left/right panel + 4 tabs + flowchart
8. **RPC update** — `submit_payrun_for_approval` with criteria evaluation + all approver types
9. **Edge function updates** — `check-reminders` + `trigger-approval-email` per-workflow support

---

## File Summary

| Action | File |
|--------|------|
| Create | Migration SQL (schema + RPC) |
| Create | `src/components/settings/PayrollSettings/ApprovalCriteriaBuilder.tsx` |
| Create | `src/components/settings/PayrollSettings/ApprovalFollowupConfig.tsx` |
| Create | `src/components/settings/PayrollSettings/ApprovalWorkflowMessages.tsx` |
| Create | `src/components/settings/PayrollSettings/ApprovalFlowChart.tsx` |
| Create | `src/components/settings/PayrollSettings/ApproverTypeModal.tsx` |
| Rewrite | `src/components/settings/PayrollSettings/WorkflowBuilder.tsx` |
| Modify | `src/components/settings/PayrollSettings/ApprovalWorkflows.tsx` |
| Modify | `src/components/settings/ApproversSection.tsx` |
| Modify | `src/lib/types/workflow.ts` |
| Modify | `src/lib/services/workflow.service.ts` |
| Modify | `supabase/functions/check-reminders/index.ts` |
| Modify | `supabase/functions/trigger-approval-email/index.ts` |

