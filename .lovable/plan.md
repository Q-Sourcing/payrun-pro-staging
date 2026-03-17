

## Employee Directory Page Improvements

### 1. Combine Bulk Import Buttons
- Remove the standalone "Bulk Import" button from the header actions (lines 401-408)
- In the "Add Employee" dropdown, merge "Bulk Upload" and "Bulk Import (XLSX)" into a single "Bulk Import" menu item that opens a combined dialog offering CSV or XLSX choice
- Alternatively, simpler approach: keep one "Bulk Import" dropdown item that opens a dialog with format selection (CSV/XLSX tabs or radio)

### 2. Collapsible Filters
- Add a `showFilters` boolean state (default `false`)
- Add a "Filter" toggle button (with `Filter` icon from lucide) in the header actions area
- Wrap the entire filters section in a conditional render based on `showFilters`
- Show active filter count badge on the filter button when filters are applied
- Keep search bar always visible outside the collapsible section

### 3. Columns Button — Icon Only
- Remove the "Columns" text label, keep only the `Settings2` icon
- Add a tooltip: "Column Visibility"

### 4. Pagination
- Add `currentPage` and `pageSize` state variables
- Slice `sortedEmployees` for the current page: `sortedEmployees.slice((page-1)*pageSize, page*pageSize)`
- Render pagination controls below the table using the existing `Pagination` components and `pagination.ts` utilities
- Include page size selector (10/25/50) and "Showing X–Y of Z" text

### 5. Horizontal Scroll Fix
- The `TableWrapper` uses `overflow-auto` — the issue is likely the outer `div.space-y-6` or the page container trapping horizontal scroll. Will add `overflow-x-auto` explicitly to the table container and ensure no parent has `overflow-hidden` clipping the scroll area. May need `overscroll-behavior-x: auto` on the scrollable container.

### 6. Add Employee Button — On-Brand Color
- Replace `bg-blue-600 hover:bg-blue-700` with the default Button variant (no className override) which uses `bg-primary text-primary-foreground` — matching the "Add Project" button style

### 7. Responsive Header Layout
- Update the `PageHeader` actions area and the button layout to use `flex-wrap` with proper responsive gaps
- On small screens, stack buttons or use an overflow menu
- Ensure the header uses `flex-wrap` and buttons have consistent sizing
- The actions container in `PageHeader` already has `flex-wrap` but the buttons inside `EmployeesTab` need `shrink-0` and proper sizing

### Files to Modify
- **`src/components/payroll/EmployeesTab.tsx`** — All changes (filters toggle, pagination, button cleanup, bulk import merge, columns icon-only, brand color, scroll fix)
- **`src/components/PageHeader.tsx`** — Minor responsive tweaks to actions container alignment
- Possibly create a small **`BulkImportDialog.tsx`** that wraps both CSV and XLSX import with a format selector, or simplify by combining the two existing dialogs' triggers into one

