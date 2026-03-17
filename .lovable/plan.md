
Goal: make payroll submission fail less often and show the real reason when it does fail.

What I found
- The frontend calls `submit_payrun_for_approval` from `src/lib/services/payruns.service.ts`.
- The currently deployed database function already uses `v_payrun.payroll_type`, so the earlier `v_payrun.type` bug has been fixed in the live DB.
- Recent database logs show these approval-related failures:
  - `record "v_payrun" has no field "type"` (historical, already fixed in current function)
  - `Payrun must be in draft or rejected status to submit`
  - `column payrun_approval_steps.workflow_id does not exist`
  - `column pay_group_master.is_active does not exist`
- The schema confirms:
  - `pay_runs` has `payroll_type`
  - `payrun_approval_steps` does not have `workflow_id`
  - `pay_group_master` uses `active`, not `is_active`

Implementation plan
1. Harden the `submit_payrun_for_approval` RPC
- Recreate the function in a fresh migration as the single source of truth.
- Keep the `payroll_type` fix.
- Add safer handling for nullable fields like `approval_status` and missing `org_settings`.
- Improve error messages so they clearly say whether the failure is:
  - wrong payrun status
  - no matching workflow
  - no resolvable approver at a given level
  - missing org/config data

2. Fix approval-builder schema mismatches
- Update approval criteria UI queries that use `pay_group_master.is_active` to use `active`.
- This is currently breaking parts of the workflow configuration screen and may prevent admins from configuring valid routing.

3. Fix step-query schema mismatches
- Find and remove any usage expecting `payrun_approval_steps.workflow_id`.
- Align those reads with the actual table shape so approval history/detail screens don’t break after submission.

4. Improve frontend error reporting
- In `PayrunsService.submitForApproval` and the payrun dialog, surface the actual Supabase/Postgres error message in the toast instead of only showing a generic failed submission.
- This will make future approval issues immediately diagnosable from the UI.

5. Validate the full submission path
- Test these cases after the fixes:
  - draft payrun with valid workflow and resolvable approver
  - draft payrun with no workflow match
  - draft payrun with unresolved dynamic approver
  - already-submitted payrun
- Confirm the result is either:
  - successful submission with created `payrun_approval_steps`
  - or a precise, user-readable validation error

Technical notes
- The 400 is coming from a Postgres exception inside the RPC, not from the Supabase client itself.
- Based on the live function, the most likely current blockers are no matching workflow, unresolved approver resolution, or stale code elsewhere assuming old schema columns.
- There are two additional approval-related bugs worth fixing in the same pass because they will keep causing confusing failures:
  - `pay_group_master.is_active` should be `active`
  - `payrun_approval_steps.workflow_id` should not be queried
