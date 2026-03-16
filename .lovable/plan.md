

## Plan: 3 Changes

### 1. Lock Pay Run editing when submitted for approval

Currently, when a pay run has `approval_status` of `pending_approval`, `approved`, or `locked`, users can still edit pay items, run bulk actions, add/remove deductions, etc. All editing UI should be disabled.

**Approach:** Add an `isReadOnly` flag in `PayRunDetailsDialog.tsx` derived from `payRunData`:

```typescript
const isReadOnly = payRunData?.approval_status && 
  !['draft', 'rejected'].includes(payRunData.approval_status);
```

Then conditionally hide or disable:
- The "Bulk Actions" dropdown menu
- Bulk status update select
- Individual employee edit/save buttons (inline editing in expanded rows)
- "Add Custom Deduction" buttons
- All bulk operation dialogs (Add to All, Deduct from All, Apply Benefits, Recalculate Taxes, Remove Custom Items, LST operations)
- Show a read-only banner at the top: "This pay run is pending approval and cannot be edited."

Export/view-only actions (Export CSV, Generate Payslips, Generate Payroll Summary, Bank Schedule Export) remain enabled.

**File:** `src/components/payroll/PayRunDetailsDialog.tsx`

### 2. Add "Approvers" to SettingsContent (modal settings)

The `ApproversSection` component exists and is wired in `Settings.tsx` (full-page settings), but is missing from `SettingsContent.tsx` (the modal-based settings used elsewhere). Add it to both `allMenuItems` and `renderStandardContent` in `SettingsContent.tsx`.

**File:** `src/components/settings/SettingsContent.tsx`

### 3. Sort settings nav items alphabetically

Sort `allMenuItems` alphabetically by `label` in both:
- `src/pages/Settings.tsx` — reorder the array
- `src/components/settings/SettingsContent.tsx` — reorder the array

**Alphabetical order for Settings.tsx:**
About & Help, Approvers, Attendance, Company, Contracts, Data Management, Display & Theme, Email & Logic, Employees, Integrations, Notifications, Payroll, Payslip Designer, Roles & Permissions, Security, User Management

**Alphabetical order for SettingsContent.tsx:**
About & Help, Approvers, Attendance, Company Settings, Contract Templates, Data Management, Display & Theme, Email & Logic, Employee Settings, Integrations, Notifications, Payroll Settings, Payslip Designer, Reminders, Security & Access, System Settings

