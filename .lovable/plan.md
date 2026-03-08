

# Time & Attendance Engine — Combined Build Plan

## Architecture Overview

A 4-layer Time & Attendance Engine that replaces the standalone Timesheets module and adds organization-wide attendance tracking with multi-country, multi-geofence support.

```text
Layer 1: TIME CAPTURE          → attendance_time_logs (clock in/out, GPS, QR, supervisor, API)
Layer 2: POLICY ENGINE          → attendance_policies, shifts, geofences, exemptions
Layer 3: ATTENDANCE PROCESSING  → attendance_daily_summary (auto-computed statuses)
Layer 4: TIMESHEET LAYER        → timesheets + timesheet_entries (human confirmation, project allocation, corrections)
                                      ↓
                                   PAYROLL
```

The existing `timesheets` / `timesheet_entries` tables become Layer 4. The existing IPPMS attendance (project-scoped, `ippms` schema) remains untouched for IPPMS projects.

---

## Database Schema (public schema, all new tables)

### Enums
- `attendance_status_enum`: PRESENT, ABSENT, LATE, HALF_DAY, LEAVE, SICK, OFF, PUBLIC_HOLIDAY, REMOTE
- `attendance_mode_enum`: MOBILE_GPS, QR_CODE, BIOMETRIC, SUPERVISOR, API, TIMESHEET_ONLY
- `tracking_type_enum`: MANDATORY, OPTIONAL, EXEMPT
- `regularization_status_enum`: PENDING, APPROVED, REJECTED, AUTO_APPROVED
- `recorded_source_enum`: ADMIN, SELF_CHECKIN, BULK_UPLOAD, SYSTEM, QR, BIOMETRIC, API

### Layer 1 — Time Capture

**`attendance_time_logs`** — raw clock events, stored in UTC
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| employee_id | uuid FK → employees | |
| project_id | uuid FK → projects, nullable | clock-in project selection |
| clock_in_utc | timestamptz | |
| clock_out_utc | timestamptz, nullable | |
| timezone | text | e.g. `Africa/Kampala` |
| local_clock_in | timestamptz | computed/stored for display |
| local_clock_out | timestamptz, nullable | |
| attendance_mode | attendance_mode_enum | |
| latitude | numeric, nullable | |
| longitude | numeric, nullable | |
| geofence_id | uuid FK, nullable | matched geofence |
| device_id | text, nullable | fraud prevention |
| photo_url | text, nullable | optional photo capture |
| recorded_source | recorded_source_enum | |
| recorded_by | uuid, nullable | admin who marked |
| remarks | text, nullable | |
| is_valid | boolean, default true | flagged by policy engine |
| created_at / updated_at | timestamptz | |

### Layer 2 — Policy Engine

**`attendance_policies`** — per-organization (or per-company) rules
| Column | Notes |
|---|---|
| id, organization_id | |
| grace_period_minutes | default 15 |
| late_threshold_minutes | default 30 |
| half_day_hours | default 4 |
| max_late_per_month | nullable |
| overtime_enabled | boolean |
| overtime_threshold_hours | default 8 |
| regularization_enabled | boolean |
| regularization_auto_approve | boolean |
| require_geolocation | boolean |
| geofence_radius_meters | default 200 |
| allow_self_checkin | boolean |
| work_start_time | time |
| work_end_time | time |
| default_timezone | text, default 'Africa/Kampala' |

**`geofences`** — named locations
| Column | Notes |
|---|---|
| id, organization_id | |
| name | e.g. "Head Office Kampala" |
| country | text |
| latitude, longitude | numeric |
| radius_meters | int |
| type | office / site / client |
| is_active | boolean |

**`employee_geofences`** — M:N assignment
| employee_id, geofence_id, allowed (bool), priority (int) |

**`shifts`** — with timezone
| id, organization_id, name, start_time, end_time, timezone, grace_period_minutes, overtime_threshold, break_minutes, is_default |

**`shift_assignments`** — employee ↔ shift
| employee_id, shift_id, start_date, end_date, is_active |

**`employee_time_policies`** — exemptions & mode per employee
| employee_id, attendance_required (bool), timesheet_required (bool), tracking_type (enum), attendance_mode (enum) |

### Layer 3 — Attendance Processing

**`attendance_daily_summary`** — one row per employee per day, auto-computed
| Column | Notes |
|---|---|
| id, organization_id, employee_id | |
| attendance_date | date |
| project_id | nullable |
| status | attendance_status_enum (computed) |
| first_clock_in | timestamptz |
| last_clock_out | timestamptz |
| total_hours | numeric |
| overtime_hours | numeric |
| is_late | boolean |
| late_minutes | int |
| shift_id | FK |
| is_locked | boolean (payroll lock) |
| payrun_id | uuid, nullable (Phase 2) |

**`attendance_regularization_requests`** — appeals
| id, employee_id, attendance_date, requested_clock_in, requested_clock_out, reason, status (regularization_status_enum), approved_by, approval_date, approval_notes |

### Layer 4 — Timesheet (existing tables enhanced)

The existing `timesheets` and `timesheet_entries` tables remain. We add:
- `attendance_daily_summary_id` FK on `timesheet_entries` — links entry to attendance
- `time_in` / `time_out` columns on `timesheet_entries` — for time-in/out display
- No structural break to existing timesheet functionality

### Devices (security)

**`attendance_devices`** — registered devices
| id, employee_id, device_id, device_name, is_trusted, registered_at |

---

## RLS Policies

- Employees: read own time_logs, daily_summary, regularization_requests; insert time_logs for self (self-checkin)
- Admins/managers (via `has_permission` or `is_org_admin`): full CRUD on org records
- Policies/geofences/shifts: admin write, org-member read
- Employee_time_policies: admin write, employee read own

---

## Frontend Pages & Navigation

### Sidebar Changes
Under **My Dashboard**:
- "My Timesheets" → renamed to **"My Time & Attendance"** → `/dashboard/attendance`
  - Sub-view: self-check-in, personal calendar, timesheet creation (existing flow preserved)

Top-level admin section (permission-gated):
- **"Attendance"** → `/attendance` with tabs:
  - Dashboard (summary cards + trend charts)
  - Mark Attendance (admin grid, date picker, batch actions)
  - Bulk Upload (XLSX template)
  - Regularization Requests (approve/reject queue)
  - Reports

Settings:
- **"Attendance"** menu item in Settings → `/settings` section for policies, geofences, shifts, exemptions

### Key Components to Build

1. **`src/components/attendance/SelfCheckIn.tsx`** — GPS capture, geofence validation, project selector, clock in/out button
2. **`src/components/attendance/AttendanceCalendar.tsx`** — monthly calendar view with status colors
3. **`src/components/attendance/AdminAttendanceGrid.tsx`** — reuse patterns from `IppmsAttendanceGrid`
4. **`src/components/attendance/BulkUploadAttendance.tsx`** — XLSX template download + upload
5. **`src/components/attendance/RegularizationPanel.tsx`** — request + approval UI
6. **`src/components/attendance/AttendanceDashboard.tsx`** — HR summary cards + charts
7. **`src/components/attendance/ProjectAttendanceDashboard.tsx`** — project-level view
8. **`src/components/settings/AttendanceSettingsSection.tsx`** — policies, geofences, shifts, exemptions config
9. **`src/pages/Attendance.tsx`** — admin management page
10. **`src/pages/MyDashboard/Attendance.tsx`** — employee self-service page (replaces standalone Timesheets route)
11. **`src/lib/services/attendance.service.ts`** — CRUD service layer

### Timesheet Integration
The existing Timesheets page (`/timesheets`) merges into the My Attendance page as a tab. Timesheet entries gain an optional link to `attendance_daily_summary`, allowing pre-population from attendance data. The create-timesheet flow remains but can auto-fill hours from attendance logs.

---

## Implementation Phases

### Phase 1 — MVP (build now)
1. Database migration: all tables, enums, RLS, indexes, triggers
2. Service layer: `AttendanceService` 
3. Self-check-in with GPS + geofence validation
4. Admin attendance marking grid
5. Attendance status engine (auto-compute daily summary)
6. Shift management UI
7. Multi-geofence setup in settings
8. Regularization requests (submit + approve)
9. Attendance dashboard (HR + project-level)
10. Timesheet integration (link entries to attendance)
11. Bulk upload via XLSX
12. Sidebar + routing updates

### Phase 2 — Later
- Payroll integration (`payrun_id` on daily_summary)
- Biometric integration
- QR code rotation (30-second rotating codes)
- AI anomaly detection (ghost workers, GPS spoofing, pattern absenteeism)
- Facial verification on clock-in
- Advanced analytics & reports
- Device trust management

---

## Technical Notes

- **All times stored in UTC**. `timezone` column per log. Display uses `Intl.DateTimeFormat` with the employee's timezone.
- **Geofence check**: Haversine formula in JS at clock-in time. If `require_geolocation` is on and employee is outside all assigned geofences, clock-in is rejected.
- **Project selection at clock-in**: enables automatic project labour cost tracking — a differentiator for construction/outsourcing companies.
- **Status engine**: a DB trigger or service-layer function that runs after time_log insert/update to recompute `attendance_daily_summary` for that employee+date.
- **Dark mode**: all new components use Tailwind semantic tokens.
- **Existing IPPMS attendance**: untouched. IPPMS projects continue using the `ippms` schema. The new module covers organization-wide attendance.

