# Foreign Key Constraint Fix - Complete

## Summary
Fixed the foreign key constraint violation error when creating expatriate pay runs by using the correct `paygroup_id` from the `expatriate_pay_groups` table.

## Problem
When creating an expatriate pay run, the system was using `expatriate_pay_groups.id` directly as the `pay_group_id` when inserting into the `pay_runs` table. However, the `pay_runs` table has a foreign key constraint that expects `pay_group_id` to reference `pay_groups.id`, not `expatriate_pay_groups.id`.

**Error:**
```
Error: insert or update on table "pay_runs" violates foreign key constraint "pay_runs_pay_group_id_fkey"
Details: Key is not present in table "pay_groups"
```

## Database Schema Understanding

### expatriate_pay_groups table
- `id` (primary key) - unique identifier for the expatriate pay group record
- `paygroup_id` (foreign key) - references `pay_groups.id`
- `name`, `country`, `currency` - expatriate-specific details

### pay_runs table
- `id` (primary key)
- `pay_group_id` (foreign key) - **must reference `pay_groups.id`**

## Solution

### 1. Updated PayGroup Interface
Added optional fields for expatriate pay groups:

```typescript
interface PayGroup {
  id: string;
  name: string;
  country: string;
  pay_frequency?: string;
  type?: string;
  paygroup_id?: string; // For expatriate pay groups, this links to pay_groups.id
  currency?: string; // For expatriate pay groups
}
```

### 2. Use paygroup_id When Creating Expatriate Pay Runs

In `CreatePayRunDialog.tsx`, before inserting the pay run:

```typescript
// Determine the correct pay_group_id to use
let actualPayGroupId = formData.pay_group_id;

if (payrollType?.toLowerCase() === "expatriate") {
  const selectedExpatriateGroup = payGroups.find(g => g.id === formData.pay_group_id);
  if (selectedExpatriateGroup && 'paygroup_id' in selectedExpatriateGroup) {
    actualPayGroupId = (selectedExpatriateGroup as any).paygroup_id;
    console.log("🔗 Using paygroup_id for expatriate group:", actualPayGroupId);
  }
}
```

Then use `actualPayGroupId` when:
1. Creating the pay run record
2. Fetching employees for that pay group

## Changes Made

### CreatePayRunDialog.tsx

1. **Updated PayGroup interface** to include `paygroup_id` and `currency`
2. **Added logic to determine correct pay_group_id**:
   - For expatriate: use `paygroup_id` from selected group
   - For regular: use `id` directly
3. **Use `actualPayGroupId`** in:
   - Pay run creation insert
   - Employee fetching query

### Code Changes

```typescript
// Determine the correct pay_group_id to use
let actualPayGroupId = formData.pay_group_id;

if (payrollType?.toLowerCase() === "expatriate") {
  const selectedExpatriateGroup = payGroups.find(g => g.id === formData.pay_group_id);
  if (selectedExpatriateGroup && 'paygroup_id' in selectedExpatriateGroup) {
    actualPayGroupId = (selectedExpatriateGroup as any).paygroup_id;
  }
}

// Use actualPayGroupId when creating pay run
const { data: payRunData } = await supabase
  .from("pay_runs")
  .insert({
    pay_group_id: actualPayGroupId, // Use the correct ID
    // ... other fields
  });

// Use actualPayGroupId when fetching employees
const { data: employees } = await supabase
  .from("employees")
  .select("...")
  .eq("pay_group_id", actualPayGroupId);
```

## Expected Behavior

### Before Fix
1. User selects expatriate pay group (e.g., "expat")
2. System uses `expatriate_pay_groups.id` as `pay_group_id`
3. Insert fails: `expatriate_pay_groups.id` doesn't exist in `pay_groups` table

### After Fix
1. User selects expatriate pay group (e.g., "expat")
2. System finds the selected group's `paygroup_id`
3. Uses that `paygroup_id` (which exists in `pay_groups` table) as `pay_group_id`
4. Pay run created successfully ✅
5. Employees fetched correctly ✅

## Console Output

**Successful creation:**
```
🔗 Using paygroup_id for expatriate group: <uuid-from-pay_groups>
📝 Creating pay run record with pay_group_id: <uuid-from-pay_groups>
✅ Pay run created: <new-pay-run-id>
🔍 Fetching employees for pay_group_id: <uuid-from-pay_groups>
📊 Employees found: [array of employees]
```

## Testing

1. Navigate to "Expatriate Payroll" page
2. Click "Create Pay Run"
3. Select an expatriate pay group (e.g., "expat")
4. Fill in dates and submit
5. Verify:
   - ✅ No foreign key constraint error
   - ✅ Pay run created successfully
   - ✅ Employees fetched correctly
   - ✅ Pay run appears in history

## Key Takeaway
**For expatriate pay runs, use `expatriate_pay_groups.paygroup_id` (links to `pay_groups.id`), not `expatriate_pay_groups.id`**
