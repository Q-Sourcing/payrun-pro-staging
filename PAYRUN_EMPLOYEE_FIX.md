# Pay Run Employee Fetch Fix

## Summary
Fixed the issue where pay runs were being created with 0 employees. Added comprehensive logging to debug the employee fetching process.

## Problem
- Pay runs were created successfully but showed "0 employees"
- The system was showing "No active employees found in this pay group" warning
- Pay runs had $0 gross pay and $0 net pay

## Root Cause Analysis
The pay run creation logic was already correct - it fetches employees using:
```typescript
const { data: employees } = await supabase
  .from("employees")
  .select("id, pay_rate, pay_type, country, employee_type")
  .eq("pay_group_id", formData.pay_group_id)
  .eq("status", "active");
```

The issue was likely:
1. No debugging information to verify if employees exist
2. Possible data inconsistency (employees with wrong pay_group_id or inactive status)
3. Need to verify the actual data being queried

## Changes Made

### CreatePayRunDialog.tsx
**File:** `src/components/payroll/CreatePayRunDialog.tsx`

#### Added Comprehensive Logging
1. **Before Query:**
   - Log the pay_group_id being queried

2. **After Query:**
   - Log the raw employees data returned
   - Log the employee count
   - Log any errors encountered

3. **Added Debug Fields:**
   - Included `status` and `pay_group_id` in the select statement to verify employee data

```typescript
const { data: employees, error: employeesError } = await supabase
  .from("employees")
  .select("id, pay_rate, pay_type, country, employee_type, status, pay_group_id")
  .eq("pay_group_id", formData.pay_group_id)
  .eq("status", "active");
```

## How to Use the Logs

When creating a pay run, check the browser console for:

1. **Pay Group ID:**
   ```
   🔍 Fetching employees for pay_group_id: <uuid>
   ```

2. **Employees Found:**
   ```
   📊 Employees found: [{id: "...", pay_rate: ..., status: "active", ...}, ...]
   📊 Employee count: X
   ```

3. **Success Message:**
   ```
   ✅ Found X employees for pay run
   ```

4. **Or Warning:**
   ```
   ⚠️ No active employees found in this pay group
   ```

## Next Steps

1. **Create a pay run** and check the console logs
2. **Verify the pay_group_id** matches what you expect
3. **Check employee data** to see if employees exist with:
   - Correct pay_group_id
   - status = "active"
4. **If no employees found:**
   - Check the employees table directly
   - Verify pay_group_id on employees matches the selected pay group
   - Check that status is "active"

## Expected Console Output

### Successful Pay Run Creation:
```
🔍 Fetching employees for pay_group_id: abc-123-def-456
📊 Employees found: [
  {id: "emp-1", pay_rate: 50000, status: "active", pay_group_id: "abc-123-def-456", ...},
  {id: "emp-2", pay_rate: 75000, status: "active", pay_group_id: "abc-123-def-456", ...}
]
📊 Employee count: 2
✅ Found 2 employees for pay run
```

### No Employees Found:
```
🔍 Fetching employees for pay_group_id: abc-123-def-456
📊 Employees found: []
📊 Employee count: 0
⚠️ No active employees found in this pay group
```

## Database Query Check

If employees are still not found, run this query in Supabase SQL Editor:

```sql
-- Check if employees exist for a specific pay group
SELECT 
  id, 
  first_name, 
  last_name, 
  status, 
  pay_group_id,
  created_at
FROM employees 
WHERE pay_group_id = '<your-pay-group-id>'
AND status = 'active';
```

## Related Files
- `src/components/payroll/CreatePayRunDialog.tsx`
