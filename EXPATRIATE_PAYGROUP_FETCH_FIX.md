# Expatriate Pay Group Fetch Fix

## Summary
Fixed the issue where expatriate pay groups were not being fetched in the "Create Pay Run" modal. The problem was a case-sensitivity mismatch between the query ("Expatriate") and the database values ("expatriate").

## Root Cause
- Database stores `type` as lowercase: `"expatriate"`
- Code was querying with exact match: `.eq("type", "Expatriate")`
- This caused no results to be returned

## Changes Made

### 1. CreatePayRunDialog.tsx
**File:** `src/components/payroll/CreatePayRunDialog.tsx`

#### Updated Query to Use Case-Insensitive Filter
```typescript
// Before:
query = query.eq("type", payrollType);

// After:
query = query.ilike("type", payrollType.toLowerCase());
```

#### Updated Client-Side Filtering
```typescript
// Before:
if (formData.payroll_type === "Expatriate") {
  return group.type === "Expatriate";
}

// After:
const groupType = (group.type || "").toLowerCase();
const selectedType = (formData.payroll_type || "").toLowerCase();

if (selectedType === "expatriate") {
  return groupType === "expatriate";
}
```

#### Added Debug Logging
- Added console logs to track query parameters and results
- Better error handling with empty arrays instead of mock data

### 2. ExpatriatePayrollPage.tsx
**File:** `src/pages/ExpatriatePayrollPage.tsx`

#### Updated Query
```typescript
// Before:
.eq("type", "Expatriate");

// After:
.ilike("type", "expatriate");
```

### 3. PayRunsTab.tsx
**File:** `src/components/payroll/PayRunsTab.tsx`

#### Updated Query
```typescript
// Before:
.eq("type", "Expatriate");

// After:
.ilike("type", "expatriate");
```

## How It Works Now

1. **Modal Opens from Expatriate Payroll Page:**
   - Receives `payrollType="Expatriate"` prop
   - Query uses `.ilike("type", "expatriate")` for case-insensitive matching
   - Fetches all pay groups where type matches "expatriate" (case-insensitive)

2. **User Sees:**
   - Payroll Type: "Expatriate" (read-only badge)
   - Expatriate pay groups in dropdown (if any exist)
   - Or "No expatriate pay groups found" message

3. **All Queries are Now Case-Insensitive:**
   - Works regardless of whether database has "expatriate", "Expatriate", or "EXPATRIATE"

## Testing

1. Navigate to "Expatriate Payroll" page
2. Click "Create Pay Run"
3. ✅ Should see expatriate pay groups in dropdown
4. ✅ Should NOT see "No pay groups found" error
5. Check browser console for debug logs:
   - `🔍 Fetching pay groups, payrollType: Expatriate`
   - `✅ Pay groups fetched: [...]`

## Benefits

- ✅ Case-insensitive matching handles any data format
- ✅ Better error handling (no fake data fallbacks)
- ✅ Comprehensive debug logging for troubleshooting
- ✅ Consistent behavior across all components
- ✅ Future-proof for any case variations

## Related Files
- `src/components/payroll/CreatePayRunDialog.tsx`
- `src/pages/ExpatriatePayrollPage.tsx`
- `src/components/payroll/PayRunsTab.tsx`
