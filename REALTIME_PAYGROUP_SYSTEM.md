# 🔄 Realtime PayGroup System Documentation

## Overview

The Q-Payroll app now features a fully automatic and realtime employee ↔ paygroup relationship system. This system ensures that:

1. **Database Automation**: Changes to `employees.pay_group_id` automatically sync with `paygroup_employees` table
2. **Realtime Updates**: Frontend components automatically refresh when paygroup assignments change
3. **Performance**: Uses optimized views and efficient queries
4. **Data Integrity**: Prevents duplicates and maintains referential integrity

## 🏗️ Architecture

### Database Layer

#### Tables
- `employees` - Main employee data with `pay_group_id` column
- `pay_groups` - Pay group definitions
- `paygroup_employees` - Join table for employee-paygroup relationships
- `paygroup_employees_view` - Optimized view joining all three tables

#### Triggers & Functions
- `sync_paygroup_employees()` - Automatically syncs `paygroup_employees` when `employees` changes
- `notify_paygroup_employees_change()` - Sends realtime notifications
- `backfill_paygroup_employees()` - Backfills missing data from existing employees

### Frontend Layer

#### Hooks
- `usePaygroupRealtime()` - General realtime subscription for all paygroup changes
- `usePaygroupRealtimeForGroup()` - Group-specific realtime subscription
- `usePaygroupRealtimeRefetch()` - Simplified hook for basic refetch functionality

#### Components
- `PayGroupCard` - Shows employee counts with realtime updates
- `ViewAssignedEmployeesDialog` - Lists employees with realtime updates
- `AssignEmployeeModal` - Manages employee assignments

## 🚀 Features

### 1. Automatic Database Sync

When an employee's `pay_group_id` changes:

```sql
-- Employee updated to new pay group
UPDATE employees SET pay_group_id = 'new-group-id' WHERE id = 'employee-id';

-- Automatically triggers:
-- 1. Mark old assignment as inactive
-- 2. Create new assignment in paygroup_employees
-- 3. Send realtime notification
```

### 2. Realtime Frontend Updates

Components automatically refresh when:
- Employee is added to a paygroup
- Employee is removed from a paygroup  
- Employee is moved between paygroups
- Paygroup assignment is modified

### 3. Performance Optimizations

- Uses `paygroup_employees_view` for efficient queries
- Implements proper indexing
- Minimizes database calls with realtime updates
- Prevents unnecessary re-renders

## 📋 Implementation Details

### Database Migration

Run the migration to set up the automatic system:

```sql
-- File: supabase/migrations/20250120000000_automatic_paygroup_sync.sql
-- This creates:
-- - sync_paygroup_employees() function
-- - trigger_sync_paygroup_employees trigger
-- - notify_paygroup_employees_change() function
-- - trigger_notify_paygroup_employees trigger
-- - backfill_paygroup_employees() function
-- - Performance indexes
```

### Frontend Integration

#### Basic Usage

```typescript
import { usePaygroupRealtimeRefetch } from '@/hooks/usePaygroupRealtime';

function PayGroupComponent() {
  const [payGroups, setPayGroups] = useState([]);
  
  const refetchPayGroups = () => {
    // Your refetch logic
    fetchPayGroups();
  };
  
  // Automatically refetch when paygroup changes occur
  usePaygroupRealtimeRefetch(refetchPayGroups);
  
  return <div>...</div>;
}
```

#### Advanced Usage

```typescript
import { usePaygroupRealtimeForGroup } from '@/hooks/usePaygroupRealtime';

function PayGroupCard({ payGroupId }) {
  const [employeeCount, setEmployeeCount] = useState(0);
  
  usePaygroupRealtimeForGroup(payGroupId, {
    onEmployeeAdded: (payload) => {
      console.log('Employee added:', payload);
      setEmployeeCount(prev => prev + 1);
    },
    onEmployeeRemoved: (payload) => {
      console.log('Employee removed:', payload);
      setEmployeeCount(prev => prev - 1);
    },
    onEmployeeUpdated: (payload) => {
      console.log('Employee updated:', payload);
      // Handle update
    }
  });
  
  return <div>Employee Count: {employeeCount}</div>;
}
```

## 🧪 Testing

### Run the Complete Test Suite

```bash
# Test the entire realtime system
node scripts/test-realtime-system.cjs

# Test specific components
node scripts/test-paygroup-fixes.cjs
node scripts/test-final-paygroup-fix.cjs
```

### Manual Testing

1. **Database Triggers**:
   - Update an employee's `pay_group_id`
   - Check that `paygroup_employees` is automatically updated
   - Verify old assignments are marked as inactive

2. **Realtime Updates**:
   - Open multiple browser tabs with PayGroup components
   - Make changes in one tab
   - Verify other tabs update automatically

3. **Performance**:
   - Check browser console for realtime events
   - Monitor network requests (should be minimal)
   - Verify smooth UI updates

## 🔧 Configuration

### Environment Variables

Ensure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Settings

Enable Realtime for the `paygroup_employees` table:

```sql
-- Enable realtime for paygroup_employees table
ALTER PUBLICATION supabase_realtime ADD TABLE paygroup_employees;
```

## 🐛 Troubleshooting

### Common Issues

1. **Realtime not working**:
   - Check Supabase Realtime is enabled
   - Verify table is added to realtime publication
   - Check browser console for connection errors

2. **Triggers not firing**:
   - Verify migration was run successfully
   - Check function and trigger exist in database
   - Test with manual SQL updates

3. **Performance issues**:
   - Check if indexes are created
   - Monitor query performance
   - Verify view is being used correctly

### Debug Mode

Enable debug logging:

```typescript
// In your component
usePaygroupRealtimeForGroup(payGroupId, {
  onAnyChange: (payload) => {
    console.log('🔄 PayGroup change:', payload);
  }
});
```

## 📈 Performance Metrics

### Expected Performance

- **Database triggers**: < 50ms execution time
- **Realtime events**: < 100ms propagation time
- **Frontend updates**: < 200ms UI refresh time
- **Query performance**: < 100ms for view queries

### Monitoring

Monitor these metrics:
- Realtime connection status
- Database trigger execution time
- Frontend component re-render frequency
- Network request count

## 🔮 Future Enhancements

### Planned Features

1. **Bulk Operations**: Support for bulk employee assignments
2. **Audit Trail**: Track all paygroup assignment changes
3. **Conflict Resolution**: Handle concurrent assignment changes
4. **Offline Support**: Queue changes when offline
5. **Analytics**: Track assignment patterns and trends

### API Extensions

```typescript
// Future API enhancements
interface PayGroupRealtimeAPI {
  bulkAssign(assignments: EmployeeAssignment[]): Promise<void>;
  getAuditTrail(payGroupId: string): Promise<AuditEntry[]>;
  resolveConflicts(conflicts: Conflict[]): Promise<void>;
}
```

## 📚 Related Files

### Database
- `supabase/migrations/20250120000000_automatic_paygroup_sync.sql`
- `supabase/migrations/20250116000005_create_optimized_views.sql`

### Frontend
- `src/hooks/usePaygroupRealtime.ts`
- `src/components/paygroups/PayGroupCard.tsx`
- `src/components/paygroups/ViewAssignedEmployeesDialog.tsx`
- `src/components/paygroups/AssignEmployeeModal.tsx`

### Testing
- `scripts/test-realtime-system.cjs`
- `scripts/test-paygroup-fixes.cjs`
- `scripts/test-final-paygroup-fix.cjs`

## 🎯 Success Criteria

The system is considered successful when:

✅ **Automatic Sync**: Employee paygroup changes automatically update `paygroup_employees`  
✅ **Realtime Updates**: Frontend components update without manual refresh  
✅ **Performance**: Queries complete in < 100ms  
✅ **Data Integrity**: No duplicate or orphaned records  
✅ **User Experience**: Smooth, responsive UI updates  
✅ **Reliability**: System works consistently across all scenarios  

---

*This system provides a robust, scalable foundation for employee-paygroup management with realtime capabilities.*
