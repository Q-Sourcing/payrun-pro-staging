
# Implementation Plan: Project Onboarding, Contracts, Reminders & Bulk Operations

This plan addresses the 7 follow-up tasks from Simon's feedback session, organized into phased deliverables.

---

## Phase 1: Enhanced Project Onboarding (Foundation)

### 1.1 Add `responsible_manager_id` to Projects Table
- Add a new column `responsible_manager_id UUID REFERENCES users(id)` to the `projects` table
- Add `client_name`, `location`, and `contract_value` columns for richer project metadata
- Update the `AddProjectDialog` form to include a manager selector (searchable dropdown of users with `PROJECT_MANAGER` or `ORG_ADMIN` roles)
- Add auto-assignment logic: when `project_type = 'ippms'`, default manager to users with `ORG_PROJECT_MANAGER` role

### 1.2 Project Onboarding Checklist
- Add a `projects_onboarding_checklist` table:
  - `project_id`, `step_key` (e.g. `basic_info`, `manager_assigned`, `pay_types_configured`, `employees_assigned`), `completed`, `completed_at`
- Show a visual checklist/progress bar on the `ProjectDetailPage` header
- A project is "fully onboarded" when all checklist steps are complete
- Only fully onboarded projects appear in the employee form's project dropdown (already filtered by `status = 'active'`, add checklist check)

### 1.3 Improve Project Detail Page
- Redesign `ProjectDetailPage` with tabs: **Overview**, **Employees**, **Pay Groups**, **Workboard** (IPPMS only)
- Add editable project fields inline (manager, dates, description)
- Show onboarding progress prominently

---

## Phase 2: Contract Generation System (New Module)

### 2.1 Database Schema
Create the following tables:
- **`contract_templates`**: `id`, `name`, `organization_id`, `project_type`, `employee_type`, `template_body` (HTML/Markdown with placeholders like `{{first_name}}`, `{{pay_rate}}`, `{{project_name}}`), `allowance_fields` (JSONB array of allowance keys to include), `is_active`, timestamps
- **`employee_contracts`**: `id`, `employee_id`, `template_id`, `project_id`, `contract_number`, `status` (draft/active/expired/terminated), `start_date`, `end_date`, `probation_end_date`, `generated_body` (rendered HTML), `signed_at`, `allowances` (JSONB), timestamps

### 2.2 Contract Template Editor
- New page at `/settings/contract-templates`
- Rich editor for contract body with placeholder insertion toolbar (employee fields, project fields, allowance fields)
- Preview mode showing a sample contract with dummy data
- Template per project_type + employee_type combination

### 2.3 Contract Generation Flow
- On the Employee Form: after all mandatory fields are filled, show a "Generate Contract" button
- The button is disabled with a tooltip listing missing required fields (name, pay rate, project, dates, etc.)
- On click, auto-populates the template with employee + project data and creates a draft contract
- Contract can be reviewed, edited, and finalized
- PDF export using existing `jspdf` dependency

### 2.4 Allowances in Contracts
- Pre-defined allowance types: House, Travel, Airtime, Medical, Seating, Education, Transport
- During contract generation, user selects applicable allowances and enters amounts
- These are stored in `employee_contracts.allowances` as JSONB and feed into payroll

---

## Phase 3: Probation & Reminder System

### 3.1 Database Changes
- Add `probation_end_date DATE` column to the `employees` table
- Add `probation_status TEXT` (on_probation / confirmed / extended) to `employees`
- Create `reminder_rules` table: `id`, `organization_id`, `rule_type` (probation_expiry, contract_expiry), `days_before`, `notification_template`, `is_active`

### 3.2 Probation Tracking
- Auto-calculate `probation_end_date` from `date_joined` + configurable probation period (default 90 days) in `org_settings`
- Show probation status badge on employee cards and list views
- Add probation fields to the Employee Form (editable end date, status)

### 3.3 Scheduled Reminders (Edge Function)
- Create a `check-reminders` edge function that:
  - Queries employees where `probation_end_date - now() <= reminder_days`
  - Creates notifications in the existing `notifications` table for the employee's manager and HR
  - Runs daily via pg_cron
- Reminder settings configurable in Organization Settings (e.g., 15 days, 7 days, 1 day before)

---

## Phase 4: Bulk Staff Onboarding

### 4.1 Downloadable Template
- New "Bulk Import" button on the Employees page
- Generates an XLSX template (using existing `xlsx` dependency) with columns: first_name, last_name, email, phone, gender, national_id, pay_type, pay_rate, project_code, employee_type, date_joined, etc.
- Template includes a reference sheet with valid values for dropdowns (project codes, pay types, employee types)

### 4.2 Upload & Validation
- File upload dialog with drag-and-drop
- Parse uploaded XLSX, validate each row:
  - Required fields present
  - Project code exists and is active
  - Pay type valid for project
  - Email uniqueness
- Show validation results in a table (green = valid, red = errors with messages)

### 4.3 Bulk Insert & Contract Generation
- "Import Valid Rows" button inserts all valid employees in a single batch
- Option to "Auto-generate contracts" for all imported employees (using their project's contract template)
- Progress indicator showing import status
- Summary report: X employees created, Y contracts generated, Z errors

---

## Phase 5: Data Reusability & Flow Improvements

### 5.1 Cascading Data from Project to Employee
- When assigning an employee to a project, auto-fill: `pay_type` (from project's allowed types), `employee_type` (from `project_type`), `currency`, `country`
- When a project's pay types change, surface warnings for affected employees

### 5.2 Work Board Enhancements (IPPMS)
- Batch attendance entry: show all project employees in a single grid, pre-filled with "Present"
- Auto-remove absent staff from output calculation totals
- Add summary row showing: Total Present, Total Hours, Estimated Cost (hours x rate)
- Add "Compare with Invoice" section showing project cost vs. invoice amount

---

## Technical Details

### New Database Tables
```text
contract_templates
  - id UUID PK
  - name TEXT
  - organization_id UUID FK
  - project_type TEXT
  - employee_type TEXT  
  - template_body TEXT
  - allowance_fields JSONB
  - is_active BOOLEAN
  - created_at, updated_at

employee_contracts
  - id UUID PK
  - employee_id UUID FK
  - template_id UUID FK
  - project_id UUID FK
  - contract_number TEXT UNIQUE
  - status TEXT (draft/active/expired/terminated)
  - start_date DATE
  - end_date DATE
  - probation_end_date DATE
  - generated_body TEXT
  - allowances JSONB
  - signed_at TIMESTAMPTZ
  - created_at, updated_at

reminder_rules
  - id UUID PK
  - organization_id UUID FK
  - rule_type TEXT
  - days_before INTEGER
  - notify_roles TEXT[]
  - is_active BOOLEAN

project_onboarding_steps
  - id UUID PK
  - project_id UUID FK
  - step_key TEXT
  - completed BOOLEAN
  - completed_at TIMESTAMPTZ
```

### New Columns on Existing Tables
- `projects`: `responsible_manager_id`, `client_name`, `location`, `contract_value`
- `employees`: `probation_end_date`, `probation_status`

### New Files
- `src/components/contracts/ContractTemplateEditor.tsx`
- `src/components/contracts/GenerateContractDialog.tsx`
- `src/components/contracts/ContractPreview.tsx`
- `src/components/employees/BulkImportDialog.tsx`
- `src/components/employees/BulkImportValidationTable.tsx`
- `src/components/projects/ProjectOnboardingChecklist.tsx`
- `src/components/settings/ReminderSettings.tsx`
- `src/lib/services/contracts.service.ts`
- `src/lib/services/bulk-import.service.ts`
- `src/lib/services/reminders.service.ts`
- `supabase/functions/check-reminders/index.ts`

### New Routes
- `/settings/contract-templates` - Template editor
- `/employees/bulk-import` - Bulk import wizard

### Suggested Build Order
1. Phase 1 (Project Onboarding) - foundation for everything else
2. Phase 5.1 (Data Reusability) - quick win, improves existing flow
3. Phase 3 (Probation & Reminders) - standalone, uses existing notifications
4. Phase 2 (Contract Generation) - most complex, depends on Phase 1
5. Phase 4 (Bulk Import) - depends on Phase 2 for auto-contract generation
6. Phase 5.2 (Work Board) - independent enhancement
