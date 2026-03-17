

## Phased Implementation Plan

This request contains 7 major feature areas. Due to the massive scope, I recommend implementing in **3 phases** to keep changes stable and testable.

---

### PHASE 1: Employee Form & Profile Fixes (immediate)

**1. Move Work Email & Work Phone to bottom of Employment section**
- File: `src/components/employees/EmployeeForm.tsx`
- Move the Work Email + Work Phone grid (~lines 1028-1038) from the top of Employment Information to after the Employee Number row (~line 1355), just before the closing `</AccordionContent>` of the employment section.

**2. Employee Number Prefix settings in Company Settings**
- File: `src/components/settings/CompanySettingsSection.tsx`
- Add a new card/tab for "Employee Number Prefix Configuration" with fields for: org short code, country code, head office unit code, project unit code prefix pattern.
- Store in `employee_number_settings` table (already exists) or `org_settings`.
- `EmployeeForm.tsx` reads these settings to generate prefixes dynamically.

**3. HR Records tab → make editable (add/edit/delete)**
- File: `src/components/employees/EmployeeHrRecordsTab.tsx` — currently read-only summary cards.
- Add "Add" buttons per section (Address, Dependent, Education, Experience) that open inline forms or dialogs.
- Add edit/delete actions on each item row.
- The service layer (`employee-hr-records.service.ts`) likely already has create/update/delete methods.

**4. Documents tab → make editable**
- File: `src/components/employees/EmployeeDocumentsTab.tsx` — currently read-only.
- Add "Upload Document" button with file upload to Supabase storage + metadata insert.
- Add delete/download actions per document row.

**5. Bank schedule basic salary fix**
- File: `src/lib/services/bank-schedule-service.ts` line 73
- The employee select query doesn't include `pay_rate`. Add `pay_rate` to the select.
- Include `basic_salary` from `pay_items` or `local_pay_run_items` in the schedule data if that's what's expected.

---

### PHASE 2: IPPMS Workboard Enhancements

**6. Fix IPPMS date picker not changing details**
- File: `src/components/ippms/IppmsAttendanceGrid.tsx`
- Bug: The stats summary (lines 178-185) computes from `records` which is the full month range query, not filtered by `batchDate`. Fix: add a `selectedDateRecords` filter and use it for the stats display.
- Also: the `batchInitializedFor` key check (line 151) may prevent re-initialization when switching dates within the same employee count. Needs to properly reset on date change.

**7. Daily Rate Payroll with Multi-Task Timesheet for IPPMS**
- **DB Migration**: Create `ippms_daily_timesheet_entries` table with columns: id, employee_id, project_id, work_date, task_description, units (decimal), rate_snapshot, amount (computed), status (draft/submitted/approved/rejected), approved_by, rejection_reason, created_at, updated_at.
- **DB Migration**: Add columns to employees: `allow_multiple_entries_per_day` (boolean), `max_units_per_day` (decimal default 1.0), `timesheet_approval_required` (boolean).
- **DB Migration**: Create `ippms_project_tasks` table for predefined task lists per project.
- **New component**: `IppmsDailyTimesheetGrid.tsx` — entry screen with Date | Task | Units | Rate | Amount | Status columns, daily subtotal rows, units validation against max.
- **Add to IppmsWorkTab.tsx**: New "Timesheet" sub-tab under Daily Rate lane.
- **Approval flow**: Wire into existing approval patterns — submitted entries appear in approver's queue.
- **Pay run integration**: New RPC `ippms_daily_timesheet_payrun_rows` to pull approved entries for pay period.

**8. Multiple piece tasks per day**
- The piece work table already supports multiple entries per day per employee. Verify the UI allows adding multiple rows. If not, add an "Add Entry" button to `IppmsPieceWorkTable.tsx`.

---

### PHASE 3: Anomaly Detection System

**9. Database schema**
- Create `anomaly_logs` table: id, anomaly_type, severity (critical/warning/info), affected_record_type, affected_record_id, description, detected_at, detected_by, resolved_at, resolved_by, resolution_action, resolution_note, organization_id, project_id, metadata (jsonb).
- Create `anomaly_rules` table for configurable thresholds.

**10. Server-side anomaly detection RPCs**
- `check_timesheet_anomalies(employee_id, work_date)` — duplicate detection, units exceeding max, rate mismatch.
- `check_employee_anomalies(employee_id)` — duplicate employee, unusual rate change.
- `check_payrun_anomalies(payrun_id)` — gross pay spike, zero pay, duplicate pay run, missing fields.
- `check_approval_anomalies(payrun_id)` — unresolvable approver, self-approval, stale approvals.
- These RPCs insert into `anomaly_logs` and return results.

**11. Frontend anomaly integration**
- Call anomaly checks on save/submit triggers in timesheet, employee form, and pay run generation.
- Show inline CRITICAL blocks (prevent save), WARNING banners (allow with acknowledgment), INFO badges.
- Wire `src/pages/Anomalies.tsx` to query `anomaly_logs` with filters by severity, section, date, status.
- Add anomaly count badge to nav item.

**12. Daily Rate Summary report**
- New report component showing employee name, total units, total gross, breakdown by task and date, filterable by pay group, project, date range, employee.

---

### Files to modify/create (summary)

| Phase | Files |
|-------|-------|
| 1 | `EmployeeForm.tsx`, `CompanySettingsSection.tsx`, `EmployeeHrRecordsTab.tsx`, `EmployeeDocumentsTab.tsx`, `bank-schedule-service.ts`, migration for prefix settings |
| 2 | `IppmsAttendanceGrid.tsx`, `IppmsWorkTab.tsx`, new `IppmsDailyTimesheetGrid.tsx`, `IppmsPieceWorkTable.tsx`, 3 migrations (timesheet table, employee fields, project tasks) |
| 3 | New `anomaly_logs` migration, new anomaly RPC functions, `Anomalies.tsx` rewrite, anomaly hooks, nav badge wiring |

### Recommendation

Given the size, I recommend starting with **Phase 1** (employee form fixes, HR/Documents editability, bank schedule fix) as these are the most immediately impactful. Shall I proceed with Phase 1, or would you prefer a different priority order?

