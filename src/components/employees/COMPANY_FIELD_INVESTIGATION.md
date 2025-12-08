# Company Field Investigation Findings

## User's Recollection
The company field used to be:
- **Read-only** (not editable)
- **Auto-populated** from the logged-in user's active company

## Investigation Results ✅ CONFIRMED

### 1. OrgContext Provides Active Company
**File:** `src/lib/tenant/OrgContext.tsx`

```typescript
interface OrgContextValue {
  organizationId: string | null;
  role: 'super_admin' | 'org_admin' | 'user' | null;
  companyId: string | null;  // ← Active company from localStorage
  companyUnitId: string | null;
  // ...
}
```

**How it works:**
- Reads from `localStorage.getItem('active_company_id')`
- Auto-populated when user logs in or selects company
- Available via `useOrg().companyId`

### 2. Database Schema Confirms Intent
**Migration:** `20250112000006_create_gwazu_company.sql`

```sql
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_company_id uuid 
REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.default_company_id IS 
'Default company ID for this organization. Used to auto-select company in forms.';
```

**Key Evidence:**
- Comment explicitly states: *"Used to auto-select company in forms"*
- Organizations have a default company
- Company should be auto-selected, not manually chosen

### 3. User Company Memberships
**Table:** `user_company_memberships`

```sql
CREATE TABLE user_company_memberships (
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  UNIQUE (user_id, company_id)
);
```

**Purpose:**
- Tracks which companies a user has access to
- When user has only 1 company → auto-select it
- When user has multiple → show company picker

---

## Current WRONG Behavior

**In EmployeeForm.tsx:**
```typescript
// WRONG: Company is a dropdown showing ALL companies
<SearchableSelect
  options={companies.map((c) => ({ value: c.id, label: c.name }))}
  value={form.getValues("company_id") || ""}
  onValueChange={(value) => form.setValue("company_id", value)}
  placeholder="Select company..."
/>
```

**Problems:**
1. ❌ User can select ANY company (security issue)
2. ❌ Not auto-populated from active company
3. ❌ Editable (should be read-only)
4. ❌ Loads all companies unnecessarily

---

## Correct ORIGINAL Behavior

**Company field should be:**
1. ✅ **Read-only** - Displayed as disabled input, not dropdown
2. ✅ **Auto-populated** - From `useOrg().companyId`
3. ✅ **Shows company name** - Not ID
4. ✅ **Hidden if no active company** - Or show warning

**Example Implementation:**
```typescript
const { companyId } = useOrg();
const [activeCompany, setActiveCompany] = useState<Company | null>(null);

// Load active company name
useEffect(() => {
  if (companyId) {
    const company = companies.find(c => c.id === companyId);
    setActiveCompany(company || null);
    form.setValue("company_id", companyId);
  }
}, [companyId, companies]);

// UI: Read-only field
<Input
  value={activeCompany?.name || "No company selected"}
  disabled
  className="bg-gray-100 cursor-not-allowed"
/>
```

---

## Impact of Fix

### Security
- ✅ Prevents users from creating employees under wrong company
- ✅ Enforces company isolation
- ✅ Respects user company memberships

### User Experience
- ✅ Simpler form (one less field to fill)
- ✅ No confusion about which company to select
- ✅ Consistent with multi-tenant design

### Data Integrity
- ✅ All employees belong to correct company
- ✅ No cross-company data leaks
- ✅ Proper organization hierarchy

---

## Recommended Fix

1. Remove company dropdown from UI
2. Add read-only company display field
3. Auto-populate `company_id` from `useOrg().companyId`
4. Load company name for display
5. Show warning if no active company selected

**Files to Modify:**
- `src/components/employees/EmployeeForm.tsx`

**Changes:**
- Remove companies state and loading logic
- Remove company SearchableSelect dropdown
- Add read-only company display
- Auto-set company_id from OrgContext
