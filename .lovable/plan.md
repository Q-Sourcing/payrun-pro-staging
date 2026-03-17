

## Employee Form & Directory Improvements

This is a large set of changes across the employee creation form, employee profile page, employee directory sorting, bank seeding, and employee number prefix logic. Here's the breakdown:

---

### 1. Move Work Email & Work Phone to Employment Information section
**File:** `src/components/employees/EmployeeForm.tsx`
- Remove the Work Email (`email`) field from the Personal Information accordion (currently Row 2, ~line 849-852)
- Remove the Work Phone field from Personal Information (currently Row 3, ~line 860-863)  
- Add them to the top of the Employment Information section (before Company row)
- Make Work Email mandatory when category is `head_office` — add a `superRefine` rule in the zod schema

### 2. Fix Nationality & Citizenship dropdowns not updating
**File:** `src/components/employees/EmployeeForm.tsx`
- **Bug:** Lines 933 and 944 use `form.getValues("nationality")` and `form.getValues("citizenship")` instead of watched values. These don't trigger re-renders, so the displayed value doesn't update when selected.
- **Fix:** Use `form.watch("nationality")` and `form.watch("citizenship")` (or use the existing watched variables pattern) so the `value` prop is reactive.

### 3. Make National ID, NSSF Number, TIN mandatory
**File:** `src/components/employees/EmployeeForm.tsx`
- Update the zod schema: change `national_id`, `nssf_number`, and `tin` from `.optional().nullable()` to `.min(1, "Required")`
- Update labels in the form to show `*` indicator

### 4. Make Designation field searchable
**File:** `src/components/employees/EmployeeForm.tsx`
- Replace the `<Select>` component for designation (~lines 1183-1196) with `<SearchableSelect>` using the same `designationsList` data

### 5. Conditional Probation fields (show only when Employment Status = "Probation")
**File:** `src/components/employees/EmployeeForm.tsx`
- Add a `probation_start_date` field to the form values type and schema
- Wrap the probation fields block (~lines 1205-1229) in a conditional: only render when `watchEmploymentStatus === "Probation"`
- When "Probation" is selected, auto-set `probation_status` to `"on_probation"` if not already set
- Add `probation_start_date` field (defaults to `date_joined`)
- Probation end date auto-calculation already exists; the 30-day-before notification is already handled by the `probation-reminders` edge function

### 6. Head office interns/trainees: allow daily_rate pay type
**File:** `src/components/employees/EmployeeForm.tsx`
- Update `getAllowedPayTypes` function (~line 196): change `case "interns"` from `["salary"]` to `["salary", "daily_rate"]`

### 7. Employee number prefix: follow ORG-COUNTRY-BUSINESSUNIT-SEQ format
**File:** `src/components/employees/EmployeeForm.tsx`
- Update `prefixOptions` logic (~lines 697-710) to generate prefix as `{org_short_code}-{country_code}-{business_unit_code}` (e.g., `QS-UG-QSSU`)
- The org prefix and business unit codes should come from company settings / company short_code
- Update the `useEffect` that sets `employee_prefix` on category change to use this new format
- The sequential number (`0001`) is already appended by the DB trigger

### 8. Update Uganda bank list with missing banks
**New migration file** to INSERT missing banks:
- Absa Bank Uganda, Bank of Baroda Uganda, Diamond Trust Bank, Finance Trust Bank, Global Trust Bank (GTBank Uganda), Orient Bank, Pride Microfinance, Standard Chartered Uganda, Top Finance Bank, Opportunity Bank Uganda

### 9. Default sort: most recently created first
**File:** `src/components/payroll/EmployeesTab.tsx`
- Change default `sortBy` state from `"name"` to `"created_at_desc"` (~line 70)
- Change `fetchEmployees` query from `.order("first_name")` to `.order("created_at", { ascending: false })` (~line 141)
- Update the sort logic in `sortedEmployees` to default to reverse `created_at` order

### 10. Employee Profile Overview: show all info in editable sections
**File:** `src/pages/EmployeeProfile.tsx`
- Expand the Overview tab to show ALL employee fields organized in cards: Personal Info, Employment Info, Pay Info, Bank Details, IDs & Documents
- Add inline edit capability: each card gets an "Edit" button that opens the relevant section in an `EditEmployeeDialog` or switches to inline editable fields
- Add missing fields: National ID, TIN, NSSF, Passport, Gender, DOB, Marital Status, Date Joined, Sub-Department, etc.
- Make HR Records and Documents tabs editable (they likely already have add/edit; will verify and ensure CRUD is fully functional)

### 11. Add `probation_start_date` column to DB
**New migration:** `ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_start_date DATE`

---

### Files to modify:
- `src/components/employees/EmployeeForm.tsx` — Items 1-7 (form restructure, validations, field fixes)
- `src/components/payroll/EmployeesTab.tsx` — Item 9 (default sort order)
- `src/pages/EmployeeProfile.tsx` — Item 10 (expanded overview with edit capability)
- `src/components/payroll/EmployeeCreateForm.tsx` — Pass new `probation_start_date` field to insert
- New migration for bank seeding (Item 8)
- New migration for `probation_start_date` column (Item 11)

