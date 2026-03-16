

## Plan: OBAC Role-Based Approvers

The `approval_workflow_steps` table already has `approver_role text` alongside `approver_user_id uuid`. The current UI ignores the role column entirely and only allows selecting individual users. This needs to support both modes.

### Change 1: Update ApproversSection UI

**File:** `src/components/settings/ApproversSection.tsx`

Modify the "Add Approver" modal to offer two modes:

- **By Role** — select an OBAC role (from `roleCatalog` in `src/lib/obacDisplay.ts`). Only roles that make sense for approval: `ORG_OWNER`, `ORG_ADMIN`, `ORG_PAYROLL_ADMIN`, `ORG_FINANCE_APPROVER`, `ORG_HEAD_OFFICE_PAYROLL`
- **By Individual** — existing user search (kept as fallback)

Toggle between modes with a simple tab/radio selector at the top of the modal.

When saving a role-based step:
```ts
{ workflow_id, level, sequence_number, approver_role: selectedRole, approver_user_id: null }
```

When saving an individual step (existing behavior):
```ts
{ workflow_id, level, sequence_number, approver_user_id: userId, approver_role: null }
```

### Change 2: Update step display

In the approver list, show role-based steps with the role label from `roleCatalog` (e.g., "Finance Approver") and a role badge instead of a user name/email.

### Change 3: Update submit RPC resolution

**File:** `src/lib/services/workflow.service.ts` — `getApprovalChainForPayrun`

When building `payrun_approval_steps` from `approval_workflow_steps`, if a step has `approver_role` instead of `approver_user_id`, resolve the role to the matching `org_users` + `org_user_roles` who hold that role in the organization. The first matching user becomes the `approver_user_id` on the payrun step instance.

However — the `submit_payrun_for_approval` RPC is a database function. Need to check if resolution happens there or in the service layer.

### Change 3 (revised): Check the RPC

The `submit_payrun_for_approval` RPC creates `payrun_approval_steps` from `approval_workflow_steps`. If a step has `approver_role` set, the RPC needs to resolve that role to actual user(s) via `org_users` + `org_user_roles` + `org_roles`. This requires a migration to update the RPC.

### Technical details

- Import `roleCatalog` from `src/lib/obacDisplay.ts` for display labels
- Filter approver-eligible roles to: `ORG_OWNER`, `ORG_ADMIN`, `ORG_PAYROLL_ADMIN`, `ORG_FINANCE_APPROVER`, `ORG_HEAD_OFFICE_PAYROLL`
- The `submit_payrun_for_approval` RPC will need a `LEFT JOIN` on `org_users → org_user_roles → org_roles` to resolve role-based steps to actual approver user IDs when creating payrun approval step instances

### Files changed
1. `src/components/settings/ApproversSection.tsx` — Add role selection mode to modal, update step display
2. New migration — Update `submit_payrun_for_approval` RPC to resolve `approver_role` to user IDs via OBAC tables

