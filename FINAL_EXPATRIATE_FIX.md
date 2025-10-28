# Final Expatriate Pay Group Filter Fix

## Summary
Fixed the issue where the wrong pay groups were being fetched for expatriate payroll operations.

## Root Cause
- The query was matching pay groups with `type = 'Expatriate'` (capitalized) and other variations
- Included a pay group named "expatriate" that had `type = 'regular'` 
- Was using `.in()` which included both 'expatriate' and 'Expatriate' enum values

## Solution

### 1. Exact Enum Match
Changed from:
```typescript
.in("type", ["expatriate", "Expatriate"])  // too broad, includes 'Expatriate' enum
```

To:
```typescript
.eq("type", "expatriate")  // exact match ONLY to lowercase 'expatriate'
```

### 2. Added Defensive Client-Side Filtering
After fetching from database, filter again to ensure only expatriate groups:

```typescript
if (payrollType?.toLowerCase() === "expatriate") {
  const expatriateOnly = (data || []).filter(
    (g) => String(g.type).toLowerCase() === "expatriate"
  );
  setPayGroups(expatriateOnly);
}
```

### 3. Added Debug Logging
Added `console.table()` to show exactly which groups are fetched:

```typescript
console.table((data || []).map(({ id, name, type }) => ({ id, name, type })));
```

## Database Enum Values
The `pay_group_type` enum has these values:
```sql
CREATE TYPE "public"."pay_group_type" AS ENUM (
    'local',
    'expatriate',  ← Use this
    'contractor',
    'intern',
    'temporary',
    'Expatriate',  ← Ignore this
    'Local'        ← Ignore this
);
```

## Files Changed

### ExpatriatePayrollPage.tsx
- Changed `.in()` to `.eq("type", "expatriate")`
- Added `console.table()` for debugging
- Added comment: "ONLY match type = 'expatriate' (enum)"

### CreatePayRunDialog.tsx
- Changed `.in()` to `.eq("type", "expatriate")`
- Added defensive client-side filtering
- Added `console.table()` for debugging
- Added comment: "ONLY by type, never by name"

## Expected Results

When opening "Create Pay Run" from Expatriate Payroll page:

1. Console should show:
```
🔍 Filtering by payrollType: Expatriate
✅ Applied filter: type = 'expatriate' (exact match)
✅ Pay groups fetched: [...]
📊 Detailed breakdown:
  - Name: "expat", Type: "expatriate", ID: ...
  - Name: "Priority based SLAs", Type: "expatriate", ID: ...
```

2. Console table should show ONLY groups with `type = "expatriate"`

3. Dropdown should list ONLY:
   - "expat" (type: expatriate)
   - "Priority based SLAs" (type: expatriate)

4. Should NOT show:
   - "expatriate" (type: regular) ❌
   - Any group with `type = 'Expatriate'` (capitalized) ❌

## Testing

1. Open Expatriate Payroll page
2. Click "Create Pay Run"
3. Check console for:
   - ✅ Filter: type = 'expatriate' (exact match)
   - ✅ Table showing only expatriate groups
   - ✅ Two groups shown: "expat" and "Priority based SLAs"
4. Dropdown should NOT show the "expatriate" group with type="regular"

## Key Principle
**NEVER match by name, ALWAYS by exact enum value: `type = 'expatriate'` (lowercase)**
