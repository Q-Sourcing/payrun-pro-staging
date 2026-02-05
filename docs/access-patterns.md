# Access Control Patterns Guide

A comprehensive guide for developers on implementing access control in the PayRun Pro application.

---

## Overview

PayRun Pro uses a three-tier access control system:

1. **Universal Features** - Available to all authenticated users
2. **Role-Restricted Features** - Available based on user roles
3. **Permission-Based Features** - Available based on granular permissions

This guide explains when and how to use each pattern.

---

## Pattern 1: Universal Features

### When to Use

Use this pattern for features that should be available to **ALL authenticated users**, regardless of role, permissions, or organizational context.

### Examples

✅ **Correct Universal Features**:
- Notification bell (all users receive notifications)
- User profile menu (all users have a profile)
- Help/support button (all users may need help)
- Theme toggle (all users can choose appearance)
- Logout button (all users can log out)

❌ **Incorrect Universal Features** (use role/permission checks instead):
- Admin panel links (role-specific)
- Create employee button (permission-specific)
- Company settings (context-specific)
- Reports dashboard (permission-specific)

### Implementation Pattern

#### Frontend (React)

```tsx
import { useUniversalAccess } from '@/hooks/use-universal-access';

function UniversalFeatureComponent() {
  const { isAuthenticated } = useUniversalAccess();

  // Only check authentication, NO role or permission checks
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <NotificationBell />
      <UserProfileMenu />
      <HelpButton />
    </div>
  );
}
```

**Key Points**:
- ✅ Only check `isAuthenticated`
- ❌ Do NOT check `role`, `isSuperAdmin`, or permissions
- ❌ Do NOT use `PermissionGuard` component

#### Backend (Database RLS)

Even though the UI feature is universal, the **data MUST be scoped** via RLS policies:

```sql
-- Example: Notifications table RLS
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid()); -- Data scoped to user
```

**Key Points**:
- ✅ UI shows feature to all users
- ✅ Database ensures users only see their own data
- This is **defense in depth** - security at multiple layers

---

## Pattern 2: Role-Restricted Features

### When to Use

Use this pattern for features that should be available based on **user roles** (e.g., Super Admin, Org Admin, Payroll Admin).

### Examples

✅ **Role-Restricted Features**:
- Super Admin panel (Super Admin only)
- Organization settings (Org Admin+)
- User management (Org Admin+)
- Platform configuration (Super Admin only)

### Implementation Pattern

#### Using `useUserRole` Hook

```tsx
import { useUserRole } from '@/hooks/use-user-role';

function RoleRestrictedComponent() {
  const { role, isSuperAdmin } = useUserRole();

  // Check for Super Admin
  if (isSuperAdmin) {
    return <SuperAdminPanel />;
  }

  // Check for specific role
  if (role === 'ORG_ADMIN') {
    return <OrgAdminSettings />;
  }

  if (role === 'COMPANY_PAYROLL_ADMIN') {
    return <PayrollAdminDashboard />;
  }

  return <AccessDenied />;
}
```

#### Using `PermissionGuard` (Legacy Role Checks)

```tsx
import { PermissionGuard, SuperAdminOnly } from '@/components/auth/PermissionGuard';

function App() {
  return (
    <>
      {/* Super Admin only section */}
      <SuperAdminOnly>
        <SuperAdminLink />
      </SuperAdminOnly>

      {/* Org Admin only section */}
      <PermissionGuard role="ORG_ADMIN">
        <OrgAdminFeature />
      </PermissionGuard>
    </>
  );
}
```

---

## Pattern 3: Permission-Based Features

### When to Use

Use this pattern for features that require **granular permissions** from the OBAC system (e.g., `payroll.edit`, `people.view`).

### Examples

✅ **Permission-Based Features**:
- Navigation items (Employees, Pay Groups, Pay Runs, Reports)
- Action buttons (Edit Employee, Submit Payroll, Approve Payroll)
- Data views (Employee list, Payroll reports)
- Feature sections (different tabs, panels)

### Implementation Pattern

#### Using `RBACService`

```tsx
import { RBACService } from '@/lib/services/auth/rbac';

function NavigationSidebar() {
  const canViewEmployees = RBACService.hasPermission('people.view');
  const canEditPayroll = RBACService.hasPermission('payroll.edit');
  const canViewReports = RBACService.hasPermission('reports.view');

  return (
    <nav>
      {canViewEmployees && (
        <NavItem to="/employees" label="Employees" />
      )}

      {canViewReports && (
        <NavItem to="/reports" label="Reports" />
      )}

      {canEditPayroll && (
        <Button>Edit Payroll</Button>
      )}
    </nav>
  );
}
```

#### Using `PermissionGuard` Component

```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';

function PayrollPage() {
  return (
    <div>
      {/* View permission */}
      <PermissionGuard permission="payroll.view" scopeType="COMPANY" scopeId={companyId}>
        <PayrollList />
      </PermissionGuard>

      {/* Edit permission */}
      <PermissionGuard permission="payroll.edit" scopeType="COMPANY" scopeId={companyId}>
        <EditPayrollButton />
      </PermissionGuard>

      {/* Approve permission */}
      <PermissionGuard permission="payroll.approve" scopeType="ORGANIZATION" scopeId={orgId}>
        <ApprovePayrollButton />
      </PermissionGuard>
    </div>
  );
}
```

#### Using Scoped Permissions

```tsx
import { RBACService } from '@/lib/services/auth/rbac';

function CompanySpecificFeature({ companyId }: { companyId: string }) {
  // Check permission scoped to specific company
  const canEdit = RBACService.hasScopedPermission(
    'people.edit',
    'COMPANY',
    companyId
  );

  if (!canEdit) {
    return <AccessDenied />;
  }

  return <EditEmployeeForm companyId={companyId} />;
}
```

---

## Decision Tree

Use this flowchart to decide which pattern to use:

```
Is the feature available to ALL authenticated users?
├─ YES → Use Pattern 1: Universal Features
│         - useUniversalAccess()
│         - No role/permission checks in UI
│         - RLS policies scope data
│
└─ NO → Is it based on user role (Super Admin, Org Admin, etc.)?
        ├─ YES → Use Pattern 2: Role-Restricted Features
        │         - useUserRole()
        │         - Check isSuperAdmin or specific role
        │         - Use PermissionGuard with role prop
        │
        └─ NO → Use Pattern 3: Permission-Based Features
                  - RBACService.hasPermission()
                  - PermissionGuard with permission prop
                  - Include scope (GLOBAL, ORGANIZATION, COMPANY)
```

---

## Common Pitfalls

### ❌ Pitfall 1: Using PermissionGuard for Universal Features

```tsx
// ❌ WRONG - Don't guard universal features
<PermissionGuard>
  <NotificationBell />
</PermissionGuard>

// ✅ CORRECT - Only check authentication
const { isAuthenticated } = useUniversalAccess();
if (!isAuthenticated) return null;
return <NotificationBell />;
```

### ❌ Pitfall 2: No Database-Level Security

```tsx
// ❌ WRONG - Relying only on UI checks
function EmployeeList() {
  const { isSuperAdmin } = useUserRole();
  if (!isSuperAdmin) return null;
  
  // Direct database query with no RLS - SECURITY RISK!
  const employees = await supabase.from('employees').select('*');
}

// ✅ CORRECT - UI check + RLS policy
function EmployeeList() {
  const canView = RBACService.hasPermission('people.view');
  if (!canView) return null;
  
  // Database query protected by RLS policy
  const employees = await supabase.from('employees').select('*');
  // RLS automatically filters to user's organization
}
```

### ❌ Pitfall 3: Hardcoding Roles Instead of Permissions

```tsx
// ❌ WRONG - Hardcoding role checks
if (role === 'ORG_ADMIN' || role === 'PAYROLL_ADMIN') {
  return <PayrollButton />;
}

// ✅ CORRECT - Use permission system
if (RBACService.hasPermission('payroll.edit')) {
  return <PayrollButton />;
}
```

---

## Security Best Practices

### 1. Defense in Depth

Always implement security at multiple layers:

```tsx
// ✅ Layer 1: UI Permission Check
const canEdit = RBACService.hasPermission('payroll.edit');
if (!canEdit) return null;

// ✅ Layer 2: Component Guard
<PermissionGuard permission="payroll.edit">
  <EditButton onClick={handleEdit} />
</PermissionGuard>

// ✅ Layer 3: API/Service Layer
async function handleEdit() {
  // Service checks permissions before executing
  await PayrollService.editPayroll(data);
}

// ✅ Layer 4: Database RLS
-- RLS policy on pay_runs table enforces permissions
```

### 2. Scope Permissions Appropriately

```tsx
// ✅ CORRECT - Scoped to company
const canEdit = RBACService.hasScopedPermission(
  'people.edit',
  'COMPANY',
  companyId
);

// ❌ WRONG - Global permission for company-specific data
const canEdit = RBACService.hasPermission('people.edit');
```

### 3. Always Enable RLS on New Tables

```sql
-- ✅ Step 1: Create table
CREATE TABLE public.my_new_table (...);

-- ✅ Step 2: Enable RLS
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

-- ✅ Step 3: Create policies
CREATE POLICY "select_policy" ON public.my_new_table
FOR SELECT TO authenticated
USING (
  public.has_permission('my_feature.view', 'ORGANIZATION', organization_id)
);
```

---

## Testing Access Control

### Manual Testing Checklist

When implementing access control:

- [ ] Test as Super Admin
- [ ] Test as Org Admin
- [ ] Test as Company Payroll Admin
- [ ] Test as regular user (SELF_USER)
- [ ] Test with different organizations (multi-tenancy)
- [ ] Test with different companies within same org
- [ ] Test direct API calls (bypassing UI)
- [ ] Verify RLS policies block unauthorized access

### Example Test Cases

```tsx
describe('Access Control', () => {
  it('universal features visible to all users', () => {
    loginAs('regular_user');
    expect(screen.getByTestId('notification-bell')).toBeVisible();
    expect(screen.getByTestId('profile-menu')).toBeVisible();
  });

  it('admin features hidden from regular users', () => {
    loginAs('regular_user');
    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
  });

  it('employees scoped to organization', async () => {
    const orgAUser = loginAs('org_a_admin');
    const employees = await fetchEmployees();
    
    // Should only see org A employees
    employees.forEach(emp => {
      expect(emp.organization_id).toBe(orgAUser.organization_id);
    });
  });
});
```

---

## Quick Reference

| Pattern | When to Use | Hook/Component | Example |
|---------|-------------|----------------|---------|
| **Universal** | All authenticated users | `useUniversalAccess()` | Notification bell, Profile menu |
| **Role-Based** | Specific roles only | `useUserRole()`, `PermissionGuard` | Super Admin panel, Org settings |
| **Permission-Based** | Granular feature access | `RBACService`, `PermissionGuard` | Edit buttons, Navigation items |

---

## Additional Resources

- [PermissionGuard Component](file:///Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/src/components/auth/PermissionGuard.tsx)
- [RBACService](file:///Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/src/lib/services/auth/rbac.ts)
- [useUserRole Hook](file:///Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/src/hooks/use-user-role.ts)
- [useUniversalAccess Hook](file:///Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/src/hooks/use-universal-access.ts)
- [RLS Audit Report](file:///Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/docs/rls-audit-report.md)
