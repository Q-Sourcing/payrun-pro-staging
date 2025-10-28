# Expatriate Pay Group Filter Fix

## Summary
Fixed the issue where expatriate pay groups were not being correctly fetched due to incorrect filtering logic.

## Problem
- The query was using `.eq("type", "expatriate")` which failed when database values had different casing
- Pay groups with `type = "regular"` were being included when they shouldn't be
- No case-insensitive matching was being used

## Solution

### 1. ExpatriatePayrollPage.tsx
**Changed:**
```typescript
// Before:
.eq("type", "expatriate")

// After:
.ilike("type", "expatriate")  // case-insensitive match
```

**Added:**
- Proper logging to debug which groups are fetched
- Removed `.eq("active", true)` filter (pay_groups table doesn't have `active` column)

### 2. CreatePayRunDialog.tsx
**Changed:**
```typescript
// Before:
query = query.eq("type", filterValue);

// After:
query = query.ilike("type", filterValue);  // case-insensitive match
```

**Added:**
- Detailed logging to track filtering
- Removed `.eq("active", true)` filter (pay_groups table doesn't have `active` column)
- More comprehensive logging of fetched groups

## Database Schema
The `pay_groups` table has:
- `type` column of type `pay_group_type` enum
- Possible values: 'local', 'expatriate', 'contractor', 'intern', 'temporary'
- **No `active` column** (that's in `paygroup_employees` table)

## Expected Behavior
When opening "Create Pay Run" modal from "Expatriate Payroll" page:

1. **Query executed:**
   ```sql
   SELECT id, name, country, pay_frequency, type, currency
   FROM pay_groups
   WHERE type ILIKE 'expatriate'
   ORDER BY name
   ```

2. **Expected results:**
   - Groups with `type = 'expatriate'` ✅
   - Groups with `type = 'Expatriate'` ✅ (case-insensitive)
   - Groups with `type = 'EXPATRIATE'` ✅ (case-insensitive)
   - Groups with `type = 'regular'` ❌ (should NOT appear)

3. **Console logs:**
   ```
   🔍 Filtering by payrollType: Expatriate
   🔍 Using filter value (lowercase): expatriate
   ✅ Applied filter: type ilike expatriate
   ✅ Pay groups fetched: [...]
   📊 Detailed breakdown of fetched groups:
     - Name: "expat", Type: "expatriate", ID: ...
     - Name: "Priority based SLAs", Type: "expatriate", ID: ...
   ```

## Testing
1. Navigate to "Expatriate Payroll" page
2. Click "Create Pay Run"
3. Check console logs to verify:
   - Only expatriate type groups are returned
   - Groups with type = 'regular' are NOT included
4. Verify dropdown shows only expatriate groups

## Related Files
- `src/pages/ExpatriatePayrollPage.tsx`
- `src/components/payroll/CreatePayRunDialog.tsx`
