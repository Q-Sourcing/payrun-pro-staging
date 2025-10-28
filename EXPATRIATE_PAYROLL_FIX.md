# Expatriate Payroll Page & Sidebar Scroll Fix

## Summary
Fixed the Expatriate Payroll page to properly filter and display expatriate pay runs, and fixed the sidebar scroll issue so users can access all navigation items.

## Changes Made

### 1. CreatePayRunDialog.tsx
**File:** `src/components/payroll/CreatePayRunDialog.tsx`

#### Fixed Pay Groups Query
- **Issue:** Query was trying to filter by `active` column which doesn't exist in `pay_groups` table
- **Solution:** Removed `active` field and filter
- **Note:** The `pay_groups` table does not have an `active` column - it's a different schema than expected
```typescript
const { data, error } = await supabase
  .from("pay_groups")
  .select("id, name, country, pay_frequency, type")
  .order("name");
```

#### Added Empty State Handling
- Added disabled state when no pay groups available
- Added message for empty state
- Shows "No expatriate pay groups found" when filtered

### 2. PayRunsTab.tsx
**File:** `src/components/payroll/PayRunsTab.tsx`

#### Fixed Expatriate Filtering Query
- Detects if on expatriate page using `window.location.pathname`
- **Changed approach:** Instead of filtering on nested `pay_groups.type`, now:
  1. First fetches expatriate pay group IDs from `pay_groups` table
  2. Then fetches pay runs where `pay_group_id IN (expatriate_group_ids)`
- This avoids issues with nested filtering in Supabase joins
```typescript
const isExpatriatePage = window.location.pathname.includes('/expatriate');

if (isExpatriatePage) {
  // First get expatriate pay group IDs
  const { data: expatriateGroups } = await supabase
    .from("pay_groups")
    .select("id, name, country, type")
    .eq("type", "Expatriate");
  
  // Then get pay runs for these groups
  const groupIds = expatriateGroups.map(g => g.id);
  const result = await supabase
    .from("pay_runs")
    .select(`
      *,
      pay_groups (name, country, type),
      pay_items (count)
    `)
    .in("pay_group_id", groupIds)
    .order("pay_run_date", { ascending: false });
}
```

## How It Works Now

1. **Create Pay Run Modal:**
   - When "Expatriate" is selected as payroll type, only expatriate pay groups are shown
   - When no expatriate pay groups exist, shows "No expatriate pay groups found" message
   - Dropdown is disabled when empty

2. **Expatriate Payroll Page:**
   - Shows only pay runs for expatriate pay groups
   - Filtering happens automatically based on the route
   - Works seamlessly with the Create Pay Run modal

## Testing

### Test Case 1: Create Expatriate Pay Run
1. Click "Create Pay Run" from Expatriate Payroll page
2. Select "Expatriate" as payroll type
3. ✅ Should see expatriate pay groups in dropdown
4. Select a pay group and create pay run
5. ✅ New pay run should appear on Expatriate Payroll page

### Test Case 2: No Expatriate Pay Groups
1. Click "Create Pay Run" from Expatriate Payroll page
2. Select "Expatriate" as payroll type
3. ✅ Should see "No expatriate pay groups found" message
4. ✅ Dropdown should be disabled

### Test Case 3: View Expatriate Pay Runs
1. Navigate to "Expatriate Payroll" page
2. ✅ Should only see pay runs for expatriate pay groups
3. ✅ Regular pay runs should not appear

## Database Requirements

The following columns must exist in the `pay_groups` table:
- `id` (UUID)
- `name` (text)
- `country` (text)
- `pay_frequency` (text)
- `type` (text) - should be "Expatriate", "Local", etc.

**Note:** The `pay_groups` table does NOT have an `active` column. Don't filter by it.

### 3. ExpatriatePayrollPage.tsx (NEW)
**File:** `src/pages/ExpatriatePayrollPage.tsx`

#### Created Dedicated Expatriate Payroll Page
- **Issue:** No dedicated page for expatriate payroll - was using generic PayRunsTab
- **Solution:** Created dedicated page with expatriate-specific logic
- **Features:**
  - Dedicated expatriate pay run fetching with debug logs
  - Proper error handling and empty states
  - Expatriate-specific UI with globe icon and branding
  - Independent of other pay run contexts
  - Direct navigation support

```typescript
const fetchExpatriatePayRuns = async () => {
  // First get expatriate pay group IDs
  const { data: expatriateGroups } = await supabase
    .from("pay_groups")
    .select("id, name, country, type")
    .eq("type", "Expatriate");
  
  console.log("Fetched Expatriate PayGroups:", expatriateGroups);
  
  // Then get pay runs for these groups
  const groupIds = expatriateGroups.map(g => g.id);
  const { data } = await supabase
    .from("pay_runs")
    .select(`*, pay_groups (name, country, type), pay_items (count)`)
    .in("pay_group_id", groupIds)
    .order("pay_run_date", { ascending: false });
    
  console.log("Fetched Expatriate PayRuns:", data);
};
```

### 4. App.tsx
**File:** `src/App.tsx`

#### Updated Route Configuration
- **Issue:** Route was using generic PayRunsTab instead of dedicated page
- **Solution:** Updated route to use ExpatriatePayrollPage component
- **Result:** Expatriate Payroll now has its own dedicated page with proper navigation

```typescript
// Import Expatriate Payroll page
import ExpatriatePayrollPage from "./pages/ExpatriatePayrollPage";

// Updated route
<Route path="payruns/expatriate" element={<ExpatriatePayrollPage />} />
```

### 5. Sidebar Scroll Fix
**Files:** `src/layouts/MainLayout.tsx`, `src/index.css`

#### Fixed Sidebar Overflow Issue
- **Problem:** Sidebar content was not scrollable, making it impossible to access lower navigation items on smaller screens
- **Solution:** 
  - Restructured sidebar layout with flex container
  - Made navigation section scrollable using `overflow-y-auto`
  - Fixed header and settings sections at top and bottom
  - Added proper flex properties to manage scrolling behavior

```typescript
<aside className="... flex flex-col overflow-hidden">
  {/* Fixed Header */}
  <div className="flex-shrink-0">...</div>
  
  {/* Scrollable Navigation */}
  <div className="flex-1 overflow-y-auto overflow-x-hidden">
    <NavigationSidebar />
  </div>
  
  {/* Fixed Settings at Bottom */}
  <div className="flex-shrink-0">...</div>
</aside>
```

## Notes

- The fix maintains backward compatibility with all existing pay runs
- The filtering logic is based on the route path, not props
- All pay groups must have `active = true` to appear in the dropdown
- The sidebar now properly scrolls on all screen sizes
- Settings section remains fixed at the bottom of the sidebar

