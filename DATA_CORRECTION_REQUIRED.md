# Data Correction Required - expatriate_pay_groups.paygroup_id

## Summary
The `expatriate_pay_groups.paygroup_id` column contains invalid UUID strings (e.g., "EXPG-U847") instead of valid UUIDs that reference `pay_groups.id`. This must be corrected in the database.

## Problem

### Current Database State
The `expatriate_pay_groups.paygroup_id` column contains values like:
- ❌ "EXPG-U847" (invalid UUID string)
- ❌ "EXPG-PRIORITY-202510141410" (invalid UUID string)

### Required Database State
The `expatriate_pay_groups.paygroup_id` column must contain:
- ✅ Valid UUIDs that exist in `pay_groups.id`

## Database Schema

### Tables and Relationships
```
pay_groups (id: UUID PRIMARY KEY)
    ↑
    │ (referenced by pay_runs.pay_group_id)
    │
expatriate_pay_groups
    - id (UUID PRIMARY KEY)
    - paygroup_id (UUID/FK) → MUST reference pay_groups.id
    - name
    - country
    - currency
```

### Foreign Key Constraint
```
pay_runs.pay_group_id FOREIGN KEY → pay_groups.id
```

**This means:**
- When creating a pay run, `pay_group_id` must be a valid UUID from `pay_groups.id`
- The `expatriate_pay_groups.paygroup_id` column should link each expatriate group to its corresponding `pay_groups.id`

## Data Correction Steps

### Step 1: Inspect Current Data

**Run in Supabase SQL Editor:**

```sql
-- Check pay_groups table
SELECT id, name FROM pay_groups;

-- Check expatriate_pay_groups table
SELECT id, paygroup_id, name FROM expatriate_pay_groups;
```

### Step 2: Identify the Problem

You should see that `expatriate_pay_groups.paygroup_id` contains invalid strings instead of valid UUIDs.

### Step 3: Correct the Data

**Option A: If you know which `pay_groups.id` each expatriate group should link to:**

```sql
-- Example: Update a specific expatriate_pay_group
UPDATE expatriate_pay_groups
SET paygroup_id = 'correct-uuid-from-pay-groups-id'
WHERE id = 'expatriate-pay-group-id';

-- Update all expatriate_pay_groups
-- (Adjust the WHERE conditions based on your data)
UPDATE expatriate_pay_groups
SET paygroup_id = (
  SELECT id FROM pay_groups 
  WHERE name = 'some-pay-group-name' -- Adjust condition
)
WHERE id = 'expatriate-pay-group-id';
```

**Option B: If you need to create corresponding `pay_groups` entries first:**

```sql
-- Create a pay_group entry for each expatriate group
INSERT INTO pay_groups (id, name, country, type, pay_frequency)
VALUES (
  gen_random_uuid(), -- New UUID
  'Expatriate Pay Group', -- Name from expatriate_pay_groups
  'Uganda', -- From expatriate_pay_groups
  'expatriate', -- Type
  'monthly' -- Frequency
);

-- Then update expatriate_pay_groups to link to this new pay_group
UPDATE expatriate_pay_groups
SET paygroup_id = (
  SELECT id FROM pay_groups 
  WHERE name = 'Expatriate Pay Group' AND type = 'expatriate'
)
WHERE name = 'Expatriate Pay Group';
```

### Step 4: Verify the Fix

```sql
-- Check that all paygroup_id values are valid UUIDs
SELECT id, paygroup_id, name 
FROM expatriate_pay_groups
WHERE paygroup_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- This should return 0 rows
```

```sql
-- Verify foreign key integrity
SELECT epg.*, pg.name as linked_pay_group_name
FROM expatriate_pay_groups epg
LEFT JOIN pay_groups pg ON epg.paygroup_id = pg.id;

-- All rows should show linked_pay_group_name (no NULLs)
```

## Code Changes Applied

The code has been updated to use `paygroup_id` from `expatriate_pay_groups`:

### CreatePayRunDialog.tsx
- Uses `selectedExpatriateGroup.paygroup_id` when creating pay runs
- Added error handling if `paygroup_id` is missing

### ExpatriatePayrollPage.tsx
- Uses `g.paygroup_id` when fetching pay runs
- This links to `pay_groups.id` which is referenced by `pay_runs.pay_group_id`

## After Data Correction

Once `expatriate_pay_groups.paygroup_id` contains valid UUIDs that reference `pay_groups.id`:

1. ✅ Creating expatriate pay runs will work
2. ✅ Fetching expatriate pay runs will work
3. ✅ No foreign key constraint violations
4. ✅ No UUID syntax errors

## Summary Checklist

- [ ] Inspect `expatriate_pay_groups.paygroup_id` values
- [ ] Identify which `pay_groups.id` each expatriate group should link to
- [ ] Update `expatriate_pay_groups.paygroup_id` with valid UUIDs
- [ ] Verify foreign key integrity
- [ ] Test creating an expatriate pay run
- [ ] Test fetching expatriate pay runs
