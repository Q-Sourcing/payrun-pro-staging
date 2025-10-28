# Expatriate Table Switch - Complete Fix

## Summary
Fixed the expatriate payroll system to fetch data from the correct `expatriate_pay_groups` table instead of the generic `pay_groups` table.

## Problem
The app was querying `pay_groups` table and trying to filter by `type = 'expatriate'`, but expatriate data lives in a separate `expatriate_pay_groups` table.

## Solution

### 1. ExpatriatePayrollPage.tsx Changes

**Before:**
```typescript
const { data: expatriateGroups } = await supabase
  .from("pay_groups")
  .select("id, name, country, type")
  .eq("type", "expatriate")
  .order("created_at", { ascending: false });
```

**After:**
```typescript
const { data: expatriateGroups } = await supabase
  .from("expatriate_pay_groups")
  .select("id, paygroup_id, name, country, currency")
  .order("id", { ascending: false });

// Use paygroup_id to link to pay_runs
const groupIds = expatriateGroups.map(g => g.paygroup_id);
```

**Key Changes:**
- ✅ Changed `from("pay_groups")` to `from("expatriate_pay_groups")`
- ✅ Removed `.eq("type", "expatriate")` filter (no longer needed)
- ✅ Added `paygroup_id` to select (needed to link with pay_runs)
- ✅ Added `currency` to select (expatriate-specific column)
- ✅ Use `paygroup_id` when fetching pay runs (not `id`)

### 2. CreatePayRunDialog.tsx Changes

**Before:**
```typescript
let query = supabase
  .from("pay_groups")
  .select("id, name, country, pay_frequency, type")
  .order("name");

if (payrollType?.toLowerCase() === "expatriate") {
  query = query.eq("type", "expatriate");
}
```

**After:**
```typescript
let data, error;

if (payrollType?.toLowerCase() === "expatriate") {
  // Fetch from expatriate_pay_groups table
  const result = await supabase
    .from("expatriate_pay_groups")
    .select("id, paygroup_id, name, country, currency")
    .order("name", { ascending: true });
  
  data = result.data;
  error = result.error;
} else {
  // Fetch from regular pay_groups table
  let query = supabase
    .from("pay_groups")
    .select("id, name, country, pay_frequency, type")
    .order("name");
  
  if (payrollType) {
    query = query.eq("type", payrollType.toLowerCase());
  }
  
  const result = await query;
  data = result.data;
  error = result.error;
}
```

**Key Changes:**
- ✅ Conditional table selection based on `payrollType`
- ✅ If `payrollType === "expatriate"`, fetch from `expatriate_pay_groups`
- ✅ Otherwise, fetch from `pay_groups` with type filter
- ✅ Different column selections for each table

### 3. Debug Logging

**Added:**
```typescript
if (payrollType?.toLowerCase() === "expatriate") {
  console.log("📊 Expatriate pay groups fetched from expatriate_pay_groups table");
  console.table((data || []).map(({ id, name, currency }) => ({ id, name, currency })));
}
```

**Removed:**
- Debug logging that referenced `type` column (doesn't exist in `expatriate_pay_groups`)

## Database Schema

### pay_groups table
- Contains: Regular, Contractor, Intern, Temporary payroll groups
- Columns: `id, name, country, type, pay_frequency, ...`

### expatriate_pay_groups table
- Contains: Expatriate-specific payroll groups
- Columns: `id, paygroup_id, name, country, currency, ...`
- Links to `pay_groups` via `paygroup_id`

## Expected Results

### Console Output (Create Pay Run from Expatriate Page)
```
🔍 Fetching pay groups, payrollType: Expatriate
🔍 Fetching from expatriate_pay_groups table
✅ Pay groups fetched: [2 groups]
📊 Expatriate pay groups fetched from expatriate_pay_groups table
```

**Console Table:**
```
┌────────────┬───────────────────────┬──────────┐
│ id         │ name                  │ currency │
├────────────┼───────────────────────┼──────────┤
│ uuid-1     │ expat                 │ USD      │
│ uuid-2     │ Priority based SLAs   │ USD      │
└────────────┴───────────────────────┴──────────┘
```

### Dropdown Options
1. "expat" (from expatriate_pay_groups)
2. "Priority based SLAs" (from expatriate_pay_groups)

### NOT Shown
- ❌ "expatriate" group from pay_groups (has type="regular")
- ❌ Any regular pay groups
- ❌ Any contractor/intern pay groups

## Files Changed

1. **src/pages/ExpatriatePayrollPage.tsx**
   - Changed pay groups fetch from `pay_groups` to `expatriate_pay_groups`
   - Use `paygroup_id` to link with `pay_runs`

2. **src/components/payroll/CreatePayRunDialog.tsx**
   - Conditional table selection based on `payrollType`
   - Fetch from `expatriate_pay_groups` when creating expatriate pay runs

## Testing

1. Navigate to "Expatriate Payroll" page
2. Click "Create Pay Run"
3. Verify:
   - ✅ Dropdown shows only expatriate groups ("expat", "Priority based SLAs")
   - ✅ Console shows: "Fetching from expatriate_pay_groups table"
   - ✅ Console table shows correct groups with currency
   - ✅ NO "expatriate" group with type="regular"
4. Select a group and create pay run
5. Verify pay run appears in Expatriate Payroll history

## Key Principle
**Expatriate payroll uses a separate table (`expatriate_pay_groups`), not the generic `pay_groups` table.**
