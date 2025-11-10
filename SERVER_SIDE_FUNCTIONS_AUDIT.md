# Server-Side Functions Audit Report

## Executive Summary

**Status: ⚠️ PARTIALLY SERVER-SIDE**

Most database operations are currently happening **client-side** through direct Supabase client calls. Only a few critical operations have been migrated to Edge Functions.

---

## ✅ Server-Side Functions (Edge Functions)

### 1. Payroll Calculations
- **Function**: `calculate-pay`
- **Service**: `PayrollCalculationService` (`src/lib/types/payroll-calculations.ts`)
- **Status**: ✅ **USING EDGE FUNCTION**
- **Used in**: `PayRunDetailsDialog`, `CreatePayRunDialog`

### 2. Expatriate Payroll Calculations
- **Function**: `calculate-expatriate-pay`
- **Service**: `ExpatriatePayrollService` (`src/lib/services/expatriate-payroll.ts`)
- **Status**: ✅ **USING EDGE FUNCTION**
- **Used in**: Expatriate payroll components

### 3. Assign Employee to Pay Group
- **Function**: `assign-employee-to-paygroup`
- **Service**: `AssignmentsService` (`src/lib/services/assignments.service.ts`)
- **Status**: ✅ **USING EDGE FUNCTION**
- **Used in**: `AssignEmployeeModal`, `ViewAssignedEmployeesDialog`

### 4. Create User
- **Function**: `create-user`
- **Status**: ⚠️ **EXISTS BUT NOT VERIFIED IF USED**
- **Location**: `supabase/functions/create-user/index.ts`

### 5. Database Health Monitor
- **Function**: `database-health-monitor`
- **Status**: ℹ️ **MONITORING TOOL**

### 6. Impersonate
- **Function**: `impersonate`
- **Status**: ℹ️ **ADMIN FEATURE**

---

## ❌ Client-Side Functions (Direct Database Calls)

All of these services make **direct client-side database calls** using `supabase.from()`:

### 1. Employees Service
- **File**: `src/lib/data/employees.service.ts`
- **Operations**: 
  - ✅ `getEmployees()` - Direct DB query
  - ✅ `getEmployeeById()` - Direct DB query
  - ✅ `createEmployee()` - Direct DB insert
  - ✅ `updateEmployee()` - Direct DB update
  - ✅ `deleteEmployee()` - Direct DB delete
  - ✅ `searchEmployees()` - Direct DB query
  - ✅ `getEmployeeCounts()` - Direct DB query

### 2. Pay Groups Service
- **File**: `src/lib/data/paygroups.service.ts`
- **Operations**:
  - ✅ `getPayGroups()` - Direct DB query
  - ✅ `getPayGroupById()` - Direct DB query
  - ✅ `createPayGroup()` - Direct DB insert
  - ✅ `updatePayGroup()` - Direct DB update
  - ✅ `deletePayGroup()` - Direct DB delete
  - ✅ `searchPayGroups()` - Direct DB query
  - ✅ `getPayGroupSummary()` - Direct DB query

### 3. Pay Group Employees Service
- **File**: `src/lib/data/paygroup-employees.service.ts`
- **Operations**:
  - ✅ `getPayGroupEmployees()` - Direct DB query
  - ✅ `getEmployeesByPayGroup()` - Direct DB query
  - ✅ `getPayGroupsByEmployee()` - Direct DB query
  - ✅ `unassignEmployee()` - Direct DB update
  - ✅ `updateAssignment()` - Direct DB update
  - ✅ `bulkAssignEmployees()` - Direct DB operations
  - ✅ `bulkUnassignEmployees()` - Direct DB operations
  - ⚠️ `assignEmployee()` - **Note**: Uses direct DB, but `assign-employee-to-paygroup` Edge Function exists

### 4. Users Service
- **File**: `src/lib/data/users.service.ts`
- **Operations**:
  - ✅ `getUsers()` - Direct DB query
  - ✅ `getUserById()` - Direct DB query
  - ✅ `createUser()` - Direct DB insert (uses `supabase.auth.admin`)
  - ✅ `updateUser()` - Direct DB update
  - ✅ `deleteUser()` - Direct DB delete (uses `supabase.auth.admin`)

### 5. Pay Runs Service
- **File**: `src/lib/data/payruns.service.ts`
- **Operations**:
  - ✅ `getPayRuns()` - Direct DB query
  - ✅ `getPayRunById()` - Direct DB query
  - ✅ `createPayRun()` - Direct DB insert
  - ✅ `updatePayRun()` - Direct DB update
  - ✅ `deletePayRun()` - Direct DB delete
  - ✅ `updatePayRunStatus()` - Direct DB update
  - ✅ `getPayRunSummary()` - Direct DB query

### 6. Pay Items Service
- **File**: `src/lib/data/payitems.service.ts`
- **Operations**:
  - ✅ `getPayItems()` - Direct DB query
  - ✅ `getPayItemById()` - Direct DB query
  - ✅ `createPayItem()` - Direct DB insert
  - ✅ `updatePayItem()` - Direct DB update
  - ✅ `deletePayItem()` - Direct DB delete
  - ✅ `recalculatePayItem()` - Direct DB update

### 7. Benefits Service
- **File**: `src/lib/data/benefits.service.ts`
- **Operations**:
  - ✅ `getBenefits()` - Direct DB query
  - ✅ `getBenefitById()` - Direct DB query
  - ✅ `createBenefit()` - Direct DB insert
  - ✅ `updateBenefit()` - Direct DB update
  - ✅ `deleteBenefit()` - Direct DB delete

---

## 🔍 Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE OPERATIONS                    │
│  (Direct Supabase Client Calls - supabase.from())           │
├─────────────────────────────────────────────────────────────┤
│  • Employees CRUD                                           │
│  • Pay Groups CRUD                                          │
│  • Pay Group Employees (most operations)                    │
│  • Users CRUD                                               │
│  • Pay Runs CRUD                                            │
│  • Pay Items CRUD                                           │
│  • Benefits CRUD                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE OPERATIONS                    │
│  (Supabase Edge Functions)                                  │
├─────────────────────────────────────────────────────────────┤
│  ✅ Payroll Calculations (calculate-pay)                    │
│  ✅ Expatriate Payroll (calculate-expatriate-pay)          │
│  ✅ Assign Employee to Pay Group (assign-employee-to-paygroup)│
└─────────────────────────────────────────────────────────────┘
```

### Security Concerns

1. **Row Level Security (RLS) Dependency**: All client-side operations rely entirely on Supabase RLS policies for security. If RLS is misconfigured, data could be exposed.

2. **Business Logic Exposure**: Business logic is visible in client-side code and can be manipulated.

3. **No Server-Side Validation**: Validation happens client-side, which can be bypassed.

4. **No Audit Trail**: Most operations don't have server-side audit logging.

5. **Direct Database Access**: Client has direct access to database tables, increasing attack surface.

### Performance Considerations

1. **Network Overhead**: Each operation requires a separate network call.
2. **No Caching**: Client-side operations can't benefit from server-side caching.
3. **No Batching**: Operations can't be batched at the server level.

---

## 📋 Recommendations

### High Priority (Security-Critical)

1. **Migrate User Management to Edge Functions**
   - `createUser()` - Should use Edge Function to ensure proper role assignment
   - `updateUser()` - Should use Edge Function for role changes
   - `deleteUser()` - Should use Edge Function for audit trail

2. **Migrate Pay Run Operations to Edge Functions**
   - `createPayRun()` - Should validate business rules server-side
   - `updatePayRun()` - Should enforce status transitions server-side
   - `deletePayRun()` - Should prevent deletion of processed runs server-side

3. **Migrate Pay Item Operations to Edge Functions**
   - `createPayItem()` - Should recalculate totals server-side
   - `updatePayItem()` - Should validate calculations server-side
   - `deletePayItem()` - Should update pay run totals server-side

### Medium Priority (Business Logic)

4. **Migrate Employee Operations to Edge Functions**
   - `createEmployee()` - Should generate employee numbers server-side
   - `updateEmployee()` - Should validate employee data server-side
   - `deleteEmployee()` - Should check dependencies server-side

5. **Migrate Pay Group Operations to Edge Functions**
   - `createPayGroup()` - Should validate pay group data server-side
   - `updatePayGroup()` - Should prevent invalid updates server-side
   - `deletePayGroup()` - Should check for assigned employees server-side

### Low Priority (Nice to Have)

6. **Migrate Benefits Operations to Edge Functions**
   - All CRUD operations for better audit trail

7. **Migrate Query Operations to Edge Functions**
   - Complex queries could benefit from server-side optimization
   - Could implement server-side caching

---

## 🛠️ Migration Strategy

### Phase 1: Critical Operations (Week 1-2)
1. User management Edge Functions
2. Pay run status transitions Edge Function
3. Pay item calculations Edge Function

### Phase 2: Business Logic (Week 3-4)
1. Employee operations Edge Functions
2. Pay group operations Edge Functions
3. Assignment operations consolidation

### Phase 3: Remaining Operations (Week 5-6)
1. Benefits Edge Functions
2. Query optimization Edge Functions
3. Audit logging for all operations

---

## 📊 Statistics

- **Total Service Files**: 7
- **Server-Side Functions**: 3 (43%)
- **Client-Side Functions**: 7 (100% - all have client-side operations)
- **Edge Functions Available**: 6
- **Edge Functions Used**: 3 (50%)

---

## ✅ Action Items

- [ ] Audit RLS policies for all tables
- [ ] Create Edge Functions for user management
- [ ] Create Edge Functions for pay run operations
- [ ] Create Edge Functions for pay item operations
- [ ] Migrate employee operations to Edge Functions
- [ ] Migrate pay group operations to Edge Functions
- [ ] Add audit logging to all Edge Functions
- [ ] Update service files to use Edge Functions
- [ ] Add comprehensive error handling
- [ ] Add server-side validation
- [ ] Add rate limiting to Edge Functions
- [ ] Add monitoring and logging

---

## 🔗 Related Files

- Edge Functions: `supabase/functions/`
- Service Files: `src/lib/data/`
- Client Integration: `src/lib/services/`
- Supabase Client: `src/integrations/supabase/client.ts`

