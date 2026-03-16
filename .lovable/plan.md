

## Plan: Fix Approval Workflow — 2 Remaining Gaps

### Gap 1: `org_settings` upsert fails
The `org_settings` table has `org_id uuid NOT NULL` with no default value. The `updateOrgSettings` method in `workflow.service.ts` only sets `organization_id` but not `org_id`, so any attempt to save Approver Settings fails with a NOT NULL violation.

**Fix (migration):** Add a default value to `org_id` so it auto-generates when not provided:
```sql
ALTER TABLE public.org_settings ALTER COLUMN org_id SET DEFAULT gen_random_uuid();
```

**Fix (code):** Update `workflow.service.ts` `updateOrgSettings` to also pass `org_id: settings.org_id` in the upsert payload, using the same value as `organization_id` as a fallback.

### Gap 2: `APPROVAL_REMINDER` email template missing
The `check-reminders` Edge Function looks up a template for event key `APPROVAL_REMINDER` in `email_templates`. No such row exists, so reminder emails fail with "No template found."

**Fix (data insert):** Insert a default `APPROVAL_REMINDER` template into `email_templates` with subject and HTML body using variables `{{approver_name}}`, `{{period}}`, `{{pay_group_name}}`, `{{total_gross}}`, `{{action_url}}`.

### Files Changed
1. **New migration** — `ALTER TABLE org_settings ALTER COLUMN org_id SET DEFAULT gen_random_uuid()`
2. **Data insert** — Insert `APPROVAL_REMINDER` into `email_templates`
3. **`src/lib/services/workflow.service.ts`** — Add `org_id` to the upsert payload

