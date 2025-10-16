# PayGroups ↔ Employees Integration

## Overview

This document describes the comprehensive integration between PayGroups and Employees, including assignment functionality, ID standardization, and database integrity features.

## Features Implemented

### 1. PayGroup ID Standardization

**New Format**: `<TYPE>-<INITIALS>-<YYYYMMDDHHmm>`

Examples:
- `EXPG-TP-202510141547` for "Test Pay" Expatriate Group
- `REGP-ENG-202510141548` for "Engineering Team" Regular Group
- `CNTR-SAL-202510141549` for "Sales Staff" Contractor Group

**Implementation**:
- `src/lib/utils/generatePayGroupId.ts` - Utility function for ID generation
- Auto-generates IDs in `CreatePayGroupModal` as user types
- Backfill migration for existing groups

### 2. Employee Assignment System

**Multiple Entry Points**:
1. **PayGroup Cards** - "Add Employee" button opens assignment modal
2. **Employee Creation Flow** - Filtered dropdown during employee onboarding
3. **Dedicated Assignment Modal** - Direct employee-to-paygroup assignment

**Features**:
- Search and filter employees by name, email, department
- Preset pay group selection
- Notes for assignment context
- Real-time validation and error handling

### 3. Database Integrity & Security

**Link Table**: `paygroup_employees`
- Secure RLS policies for role-based access
- Audit trail with assignment timestamps
- Soft delete with `active` flag

**Configurable Enforcement**:
- **Strict Mode**: Blocks duplicate active assignments (default)
- **Smart Mode**: Auto-deactivates old assignments, keeps history
- Per-organization configuration in `payroll_configurations` table

**Identification-Based Uniqueness**:
- Enforces one active paygroup per employee based on:
  - National ID
  - Tax Identification Number (TIN)
  - Social Security Number (SSN)
- Database trigger prevents bypassing rules

### 4. Edge Function Integration

**Function**: `assign-employee-to-paygroup`
- Secure server-side assignment processing
- Handles strict/smart mode logic
- Returns clear error messages for validation failures
- Deployed and accessible via Supabase Functions

## Technical Architecture

### Components

```
src/components/paygroups/
├── PayGroupCard.tsx          # Updated with "Add Employee" button
├── CreatePayGroupModal.tsx   # Updated with new ID generation
└── AssignEmployeeModal.tsx   # New assignment interface

src/lib/services/
└── assignments.service.ts    # Assignment API layer

src/lib/utils/
└── generatePayGroupId.ts     # ID generation utility
```

### Database Schema

```sql
-- Configuration table
payroll_configurations (
  id, organization_id, use_strict_mode, updated_at
)

-- Link table
paygroup_employees (
  id, pay_group_id, employee_id, assigned_by, 
  assigned_at, active, notes
)

-- Employee identification fields
employees (
  ..., national_id, tin, social_security_number, passport_number
)
```

### API Endpoints

- `POST /functions/v1/assign-employee-to-paygroup` - Assignment endpoint
- `GET /rest/v1/paygroup_employees` - Query assignments
- `PUT /rest/v1/payroll_configurations` - Update enforcement mode

## Usage Examples

### 1. Assign Employee from PayGroup Card

```typescript
// User clicks "Add Employee" on PayGroup card
const handleAssignEmployee = (group: PayGroup) => {
  setSelectedGroupForAssignment(group);
  setShowAssignModal(true);
};
```

### 2. Create PayGroup with Auto-Generated ID

```typescript
// ID automatically generates as user types name
const generatedId = generatePayGroupId('EXPG', 'Test Pay');
// Result: "EXPG-TP-202510141547"
```

### 3. Assignment with Validation

```typescript
const result = await AssignmentsService.assignEmployeeToPayGroup({
  employee_id: 'emp-123',
  pay_group_id: 'pg-456',
  notes: 'Promoted to senior role'
});

if (!result.success) {
  // Handle validation error (e.g., strict mode conflict)
  console.error(result.error);
}
```

## Configuration

### Strict vs Smart Mode

**Strict Mode** (Default):
- Blocks assignment if employee already has active paygroup
- Requires manual resolution of conflicts
- Clear error messages for users

**Smart Mode**:
- Automatically deactivates old assignments
- Maintains assignment history
- Seamless user experience

### RLS Policies

Access is restricted to users with roles:
- Super Admin
- Organization Admin  
- Payroll Manager

## Error Handling

### Common Scenarios

1. **Duplicate Assignment (Strict Mode)**
   ```
   Error: "This employee is already active in another paygroup. 
          Your organization uses strict mode."
   ```

2. **Missing Required Fields**
   ```
   Error: "Missing required fields"
   ```

3. **Permission Denied**
   ```
   Error: "Insufficient permissions for assignment"
   ```

## Migration Guide

### Backfill Existing PayGroup IDs

Run the backfill migration to update existing groups:

```sql
-- Updates pay_groups table
UPDATE pay_groups SET paygroup_id = new_format_id WHERE ...;

-- Updates expatriate_pay_groups table  
UPDATE expatriate_pay_groups SET paygroup_id = new_format_id WHERE ...;
```

### Deploy Edge Function

```bash
supabase functions deploy assign-employee-to-paygroup
```

## Testing Checklist

- [ ] Create Expatriate employee filters paygroups by country correctly
- [ ] Inline "Create New PayGroup" selects the new group automatically
- [ ] PayGroup card → "Add Employee" opens Assign modal with group preset
- [ ] PayGroup IDs render like `EXPG-TP-YYYYMMDDHHmm` format
- [ ] Strict mode blocks duplicates with friendly error
- [ ] Smart mode auto-deactivates old link and creates new one
- [ ] RLS tested with non-admin user: can't view/insert/update/delete without role

## Future Enhancements

1. **Bulk Assignment** - Assign multiple employees at once
2. **Assignment History** - Detailed audit trail with change tracking
3. **Notification System** - Alert users of assignment conflicts
4. **Advanced Filtering** - Filter by department, role, location
5. **Assignment Templates** - Pre-configured assignment rules

## Security Considerations

- All assignments go through Edge Function for validation
- Database triggers cannot be bypassed by direct SQL
- RLS policies enforce role-based access control
- Assignment history is maintained for audit purposes
- Identification-based uniqueness prevents data conflicts
