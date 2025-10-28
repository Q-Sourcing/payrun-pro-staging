# Contextual Create Pay Run Modal Fix

## Summary
Fixed the "Create Pay Run" modal to work contextually based on the page where it's opened.

## Changes Made

### 1. CreatePayRunDialog.tsx
- Added optional `payrollType` prop
- Updated fetch logic to filter by payroll type when provided
- Conditionally render Payroll Type dropdown or read-only badge
- Updated filtering logic to skip client-side filtering when prop is provided

### 2. ExpatriatePayrollPage.tsx
- Added `payrollType="Expatriate"` prop to CreatePayRunDialog

## How It Works Now

### When Opened from Expatriate Payroll Page:
- Shows "Payroll Type: Expatriate" as read-only badge
- Only fetches Expatriate pay groups
- No dropdown to switch types

### When Opened from All Pay Runs Page:
- Shows Payroll Type dropdown
- Fetches all pay groups
- User can switch between types

## Benefits
- Contextual behavior based on page
- Prevents type switching errors
- Optimized database queries
- Maintains flexibility where needed
