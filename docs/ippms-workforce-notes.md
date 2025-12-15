# IPPMS Workforce Module (staging)

## Manual SQL apply
- File: `ippms_workforce_module.sql` (root of repo).
- Apply with psql in staging context: `psql $STAGING_DATABASE_URL -f ippms_workforce_module.sql`.
- Creates schema `ippms` plus prefixed tables, enums, RLS, and RPCs (`ippms_*`).

## RLS/permissions
- Read for employees: can see their own rows (match `employees.user_id`).
- Admin lanes: `is_platform_admin` or `has_permission(process_payroll/approve_payroll/view_organization_employees/edit_organization_employees)` and service_role.
- Writes/locks: only privileged/service_role; catalogue/leave_types are readable by anyone.
- Policies enabled on all new ippms tables; RPCs are `security definer` but gate via `can_manage_project(project_id)` which checks admin or project membership.

## RPC surface (key)
- Work days: `ippms_get_work_days`, `ippms_update_work_type`.
- Attendance: `ippms_get_attendance`, `ippms_save_attendance_bulk`, template generate/import.
- Piece work: `ippms_get_piece_entries`, `ippms_save_piece_entries`, template generate/import.
- Leave/Holiday: `ippms_apply_leave`, `ippms_apply_holiday`; leave/holiday tables are in schema `ippms`.
- Shifts: `ippms_get_shifts`, `ippms_assign_shift`.
- Payrun lanes: `ippms_daily_payrun_rows` + `ippms_lock_daily_payrun`; `ippms_piece_payrun_rows` + `ippms_lock_piece_payrun`.

## Frontend entry point
- Project Details (`/projects/:projectId`) for IPPMS projects now shows “IPPMS Workboard” and the `IppmsWorkTab` (Daily lane: Attendance/Leave/Holidays/Shifts; Piece lane: Entries/Rates).




