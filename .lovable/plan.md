

## Plan: Robust Approval System Overhaul (Phased)

This is a large set of changes spanning database schema, UI, and business logic. Presented in 6 logical phases that can be implemented incrementally.

---

### Phase 1: Fix Bugs + Workflow Metadata

**Bug: Frozen "Add" button** — The `handleSave` function calls `ensureApprovalConfig()` which does an upsert on `payroll_approval_configs` with `onConflict: "organization_id,name"`. If no unique index exists on those two columns, the upsert hangs indefinitely. Fix: wrap `ensureApprovalConfig` in a try/catch so failures don't block the save, and ensure `setSaving(false)` always runs (add a `finally` block). Also add error logging.

**Show creator/editor on workflows** — The `approval_workflows` table already has `created_by`. Add `updated_by uuid` column. Update the UI to display "Created by X" and "Last edited by Y" on the workflow card header. Fetch creator/editor names via a join on `user_profiles`.

**Files:**
- `src/components/settings/ApproversSection.tsx` — fix try/catch, display metadata
- Migration — add `updated_by` to `approval_workflows`

---

### Phase 2: Designations Lookup Table + Dropdown

**Database:**
```text
designations (
  id uuid PK,
  organization_id uuid FK,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at, updated_at,
  UNIQUE(organization_id, name)
)
```

Add `designation_id uuid FK designations(id)` to `employees` table (keep the existing `designation` text column for backward compat / Zoho sync).

**UI Changes:**
- `EmployeeForm.tsx` — Replace the free-text `designation` Input with a `Select` dropdown populated from the `designations` table. Include "Add new" option.
- `EditEmployeeDialog.tsx` — Same dropdown refactor.
- `OrganizationSetupModal.tsx` — Wire the "Designations" tab (currently placeholder) to a CRUD management component for the `designations` table.
- Zoho sync edge function — Map Zoho's designation value to the lookup table, creating entries if missing.

**Files:**
- Migration — create `designations` table, add `designation_id` to `employees`
- New `src/components/organization-setup/DesignationsManager.tsx`
- `src/components/employees/EmployeeForm.tsx`
- `src/components/payroll/EditEmployeeDialog.tsx`
- `src/components/organization-setup/OrganizationSetupModal.tsx`
- `supabase/functions/zoho-sync-employees/index.ts`

---

### Phase 3: Full Approver Type Parity (Zoho-style)

Extend the approver type system from 2 modes (role/individual) to support all Zoho categories:

| Approver Type | Resolution Logic |
|---|---|
| **Reporting To** | Follow `employees.reports_to_id` chain (requires new column) |
| **Approver based on Role** | Existing OBAC role resolution (already works) |
| **Department Head** | Lookup `departments.head_user_id` (requires new column) |
| **Department Members** | All users in the employee's department |
| **Designation** | Users with a specific designation (e.g., "CFO") |
| **Individual (Employee)** | Specific user selection (already works) |
| **Project** | Project manager (`projects.responsible_manager_id`) |
| **Group** | A named group of users (new `approval_groups` table) |

**Database:**
- Add `reports_to_id uuid FK employees(id)` to `employees`
- Add `head_user_id uuid` to `company_units` (departments)
- Create `approval_groups` + `approval_group_members` tables
- Update `approval_workflow_steps.approver_type` CHECK constraint to include new types
- Add `approver_designation_id uuid`, `approver_department_id uuid`, `approver_group_id uuid` columns to `approval_workflow_steps`

**UI:** Refactor the "Add Approver" modal to show a type selector dropdown (like the Zoho screenshot) with contextual sub-fields per type.

**RPC:** Update `submit_payrun_for_approval` to resolve each new type at submission time.

**Files:**
- Migration — schema changes
- `src/components/settings/ApproversSection.tsx` — major refactor of modal
- Migration — update `submit_payrun_for_approval` RPC

---

### Phase 4: Criteria Builder for Workflows

Allow configuring conditions that determine which workflow applies. Move from the current "one default workflow" to conditional workflow routing.

**Database:**
```text
approval_workflow_criteria (
  id uuid PK,
  workflow_id uuid FK,
  field text NOT NULL,        -- 'pay_group', 'category', 'department', 'designation', 'amount', 'custom_field'
  operator text NOT NULL,     -- 'equals', 'not_equals', 'greater_than', 'less_than', 'in', 'contains'
  value jsonb NOT NULL,       -- the comparison value(s)
  sequence_number int,
  created_at
)
```

**UI:** Add a "Criteria" section above the approvers list (like the Zoho screenshot — condition rows with field selector, operator, value). Support "Add Condition" button.

**RPC:** Update `submit_payrun_for_approval` to evaluate criteria against the payrun data and select the matching workflow.

**Files:**
- Migration — create `approval_workflow_criteria`
- New `src/components/settings/ApprovalCriteriaBuilder.tsx`
- `src/components/settings/ApproversSection.tsx` — integrate criteria section
- Migration — update RPC

---

### Phase 5: Per-Workflow Follow-up / Reminders

Each workflow gets its own follow-up configuration instead of relying on the global `reminder_rules` table.

**Database:**
```text
approval_workflow_followups (
  id uuid PK,
  workflow_id uuid FK,
  is_enabled boolean DEFAULT false,
  followup_type text CHECK ('one_time', 'repeat'),
  days_after int NOT NULL DEFAULT 1,
  repeat_interval_days int,       -- for repeat type
  send_at_time time,              -- e.g., '10:00'
  created_at, updated_at
)
```

**UI:** Add a "Follow-up" toggle section below the approvers list (matching the Zoho screenshot — toggle, one-time/repeat radio, days input, time picker).

**Edge Function:** Update `check-reminders` to read per-workflow followup config.

**Files:**
- Migration — create `approval_workflow_followups`
- New `src/components/settings/ApprovalFollowupConfig.tsx`
- `src/components/settings/ApproversSection.tsx` — integrate
- `supabase/functions/check-reminders/index.ts` — read workflow-specific config

---

### Phase 6: Custom Email Template per Workflow

Each workflow can have its own notification messages for submission, approval, rejection, and follow-up events.

**Database:**
```text
approval_workflow_messages (
  id uuid PK,
  workflow_id uuid FK,
  event_type text CHECK ('submitted', 'approved', 'rejected', 'followup'),
  from_type text DEFAULT 'system',
  to_type text DEFAULT 'current_approver',
  subject text NOT NULL,
  body_content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at, updated_at
)
```

**UI:** Add a "Messages" tab/section in the workflow editor (matching the Zoho screenshot — From, To, Subject, Body with variable insertion).

**Files:**
- Migration — create `approval_workflow_messages`
- New `src/components/settings/ApprovalWorkflowMessages.tsx`
- `src/components/settings/ApproversSection.tsx` — add Messages tab
- Update notification insertion in RPCs to use workflow-specific templates

---

### Implementation Order

**This response will implement Phase 1** (fix the Add button bug + show workflow metadata). Phases 2-6 will follow in subsequent iterations as each phase builds on the previous one.

### Technical Notes

- OBAC roles remain for system access control. Designations are a separate HR concept used for approval routing.
- The `reports_to_id` column (Phase 3) enables "Reporting To" approval chains — this is currently missing from the schema.
- The criteria builder (Phase 4) replaces the current `payroll_approval_configs` + `payroll_approval_categories` approach with a more flexible system.
- All new approver types are resolved to concrete user IDs at submission time (same pattern as existing role resolution).

