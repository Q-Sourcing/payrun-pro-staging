

## Fix: `submit_payrun_for_approval` RPC — invalid field reference

### Root Cause
The `submit_payrun_for_approval` function references `v_payrun.type` on line 174 of migration `20260316191742`, but the `pay_runs` table has no `type` column. The correct column is `payroll_type`.

### Fix
Create a migration that replaces the function, changing `v_payrun.type` → `v_payrun.payroll_type` in the criteria matching block:

```sql
COALESCE(v_payrun.payroll_type, '') = ANY(SELECT jsonb_array_elements_text(v_step.value))
```

This is a single-line fix inside the `CREATE OR REPLACE FUNCTION` for `submit_payrun_for_approval`. The full function body will be re-deployed with only that one reference corrected.

### Files
- New migration SQL (re-creates `submit_payrun_for_approval` with the fix)

