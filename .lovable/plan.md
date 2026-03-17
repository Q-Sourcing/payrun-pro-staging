

## Build Pending Organization Setup Tabs

### Current State
- **Working**: Company Units, Employee Categories, Designations tabs
- **Placeholder ("Coming Soon")**: Locations, Departments
- **Designations** already exist as a `designations` table and are used in EmployeeForm as a dropdown (selecting by name). The DesignationsManager CRUD already works in the modal.

### What Needs to Be Built

#### 1. Database Migrations

**`locations` table** (new):
- `id` uuid PK, `organization_id` uuid FK, `name` text NOT NULL, `address` text, `city` text, `state` text, `country` text, `is_active` boolean default true, `created_at`, `updated_at`
- Unique constraint on `(organization_id, name)`
- RLS: org members can CRUD their own org's locations

**`departments` table** (new -- separate from `sub_departments` which is company-unit-scoped):
- `id` uuid PK, `organization_id` uuid FK, `name` text NOT NULL, `description` text, `parent_department_id` uuid self-FK (for hierarchy), `is_active` boolean default true, `created_at`, `updated_at`
- Unique constraint on `(organization_id, name)`
- RLS: org members can CRUD their own org's departments

#### 2. Locations Tab (`LocationsManager.tsx`)
- Same CRUD pattern as `DesignationsManager`
- Table columns: Name, City, State, Country, Actions
- Add/Edit dialog with fields: Name (required), Address, City, State, Country
- Soft delete via `is_active` toggle
- Search/filter support

#### 3. Departments Tab (`DepartmentsManager.tsx`)
- Same CRUD pattern as `DesignationsManager`
- Table columns: Name, Description, Parent Department, Actions
- Add/Edit dialog: Name (required), Description, Parent Department (dropdown of existing departments)
- Soft delete via `is_active`

#### 4. Wire New Tabs into Both Layouts
- Update `OrganizationSetupModal.tsx`: replace "Coming Soon" block for locations/departments with the new components
- Update `OrganizationSetupLayout.tsx`: same -- import and render new components, remove from "Coming Soon" array

#### 5. Designations Reflecting in Data
- The DesignationsManager already provides CRUD for the `designations` table
- The EmployeeForm already loads designations and renders a dropdown
- **Fix**: EmployeeForm currently stores the designation *name* (`d.name`) as the value. It should store `d.id` and map to the `designation_id` FK column instead of the legacy `designation` text column. This ensures that adding a designation in Org Setup immediately reflects in employee forms.
- Update the EmployeeForm select to use `d.id` as value and save to `designation_id` field
- Update EmployeeCreateForm submission to send `designation_id` instead of `designation` text

### Files to Create
- `src/components/organization-setup/LocationsManager.tsx`
- `src/components/organization-setup/DepartmentsManager.tsx`

### Files to Modify
- `src/components/organization-setup/OrganizationSetupModal.tsx` -- wire new tabs
- `src/components/organization-setup/OrganizationSetupLayout.tsx` -- wire new tabs
- `src/components/employees/EmployeeForm.tsx` -- fix designation to use `designation_id`
- `src/components/payroll/EmployeeCreateForm.tsx` -- fix designation submission

### Technical Notes
- All new components follow the existing `DesignationsManager` pattern: `useOrg()` for org scoping, `supabase` client for queries, toast for feedback, dialog for add/edit forms
- Both new tables need migration with RLS policies using `user_belongs_to_org` or `current_org_id()` for access control

