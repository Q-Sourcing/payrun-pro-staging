# PayGroups Architecture Documentation

## Overview

The PayGroups module has been completely refactored to be scalable, modern, and extensible for multiple paygroup types. This document outlines the new architecture, components, and how to extend it for future paygroup types.

## Architecture Overview

```
src/
├── lib/
│   ├── types/
│   │   └── paygroups.ts                 # Type definitions and constants
│   └── services/
│       └── paygroups.service.ts         # Service layer for Supabase operations
├── pages/
│   └── paygroups/
│       └── PayGroupsPage.tsx            # Main PayGroups page
├── components/
│   ├── paygroups/
│   │   ├── PayGroupCard.tsx             # Individual pay group card component
│   │   └── CreatePayGroupModal.tsx      # Modal for creating/editing pay groups
│   └── navigation/
│       └── PayGroupsNavigation.tsx      # Collapsible navigation component
```

## Core Components

### 1. Type System (`src/lib/types/paygroups.ts`)

The type system is the foundation of the new architecture:

#### PayGroup Types
- `regular`: Standard payroll groups for local employees
- `expatriate`: Payroll groups for employees paid in foreign currencies
- `contractor`: Payroll groups for contract workers and freelancers
- `intern`: Payroll groups for interns and trainees

#### Key Interfaces
- `PayGroupTypeDefinition`: Defines the configuration for each pay group type
- `PayGroup`: Union type for all pay group variants
- `PayGroupFormData`: Form data structure for creating/editing pay groups
- `PayGroupSummary`: Summary statistics for the dashboard

#### Auto-Generated IDs
Pay groups use auto-generated IDs with the format: `<prefix>-<country_code><unique_number>`
- Examples: `EXPG-U001`, `REGP-K002`, `CNTR-T003`

### 2. Service Layer (`src/lib/services/paygroups.service.ts`)

The service layer handles all Supabase operations:

#### Key Methods
- `getPayGroups()`: Fetch all pay groups with summary information
- `getPayGroupsByType(type)`: Fetch pay groups filtered by type
- `createPayGroup(formData)`: Create a new pay group with validation
- `updatePayGroup(id, type, formData)`: Update an existing pay group
- `deletePayGroup(id, type)`: Delete a pay group
- `validatePayGroupData(formData)`: Validate form data before submission

#### Error Handling
- Comprehensive error messages from Supabase
- Field-specific validation errors
- User-friendly error messages for common scenarios

### 3. Main Page (`src/pages/paygroups/PayGroupsPage.tsx`)

The main PayGroups page provides:

#### Features
- Summary cards showing totals and statistics
- Advanced filtering and search capabilities
- Tabbed interface for different pay group types
- Responsive grid layout for pay group cards
- Smooth animations using Framer Motion

#### State Management
- Local state for pay groups and summary data
- Loading states and error handling
- Search and filter state management

### 4. PayGroup Card (`src/components/paygroups/PayGroupCard.tsx`)

Individual pay group cards display:

#### Information
- Pay group name and auto-generated ID
- Country and currency information
- Employee count and status
- Type-specific fields (daily rate, tax percentage, etc.)
- Creation date and last updated

#### Actions
- View details
- Edit pay group
- Delete with confirmation dialog
- Status indicators

### 5. Create Modal (`src/components/paygroups/CreatePayGroupModal.tsx`)

The create modal provides:

#### Dynamic Form Fields
- Type selection with visual cards
- Dynamic form fields based on selected type
- Real-time validation with field-specific error messages
- Help text and tooltips for complex fields

#### Features
- Tabbed interface for different pay group types
- Smooth transitions between types
- Comprehensive validation
- Loading states during submission

### 6. Navigation (`src/components/navigation/PayGroupsNavigation.tsx`)

The navigation component provides:

#### Collapsible Menu
- Main "Pay Groups" item with expand/collapse
- Sub-items for each pay group type
- Smooth animations for expand/collapse
- Active state management

## Database Schema

### Regular Pay Groups
```sql
CREATE TABLE pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  pay_frequency text NOT NULL,
  default_tax_percentage numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Expatriate Pay Groups
```sql
CREATE TABLE expatriate_pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  currency text DEFAULT 'USD',
  exchange_rate_to_local numeric(12,4),
  default_daily_rate numeric(12,2),
  tax_country text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Adding New Pay Group Types

To add a new pay group type (e.g., "Temporary"):

### 1. Update Type Definitions

```typescript
// In src/lib/types/paygroups.ts
export type PayGroupType = 'regular' | 'expatriate' | 'contractor' | 'intern' | 'temporary';

export interface TemporaryPayGroup extends BasePayGroup {
  type: 'temporary';
  contract_start_date: string;
  contract_end_date: string;
  hourly_rate: number;
  max_hours_per_week: number;
}

export const PAYGROUP_TYPES: Record<PayGroupType, PayGroupTypeDefinition> = {
  // ... existing types
  temporary: {
    id: 'temporary',
    name: 'Temporary PayGroups',
    description: 'Payroll groups for temporary workers',
    icon: '⏰',
    color: 'yellow',
    prefix: 'TEMP',
    supportsDailyRate: false,
    supportsExchangeRate: false,
    supportsTaxCountry: false,
    defaultFields: [
      { id: 'contract_start_date', name: 'Contract Start Date', type: 'date', required: true },
      { id: 'contract_end_date', name: 'Contract End Date', type: 'date', required: true },
      { id: 'hourly_rate', name: 'Hourly Rate', type: 'currency', required: true },
      { id: 'max_hours_per_week', name: 'Max Hours Per Week', type: 'number', required: true }
    ]
  }
};
```

### 2. Create Database Table

```sql
CREATE TABLE temporary_pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  currency text DEFAULT 'UGX',
  contract_start_date date NOT NULL,
  contract_end_date date NOT NULL,
  hourly_rate numeric(12,2) NOT NULL,
  max_hours_per_week integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Update Service Layer

```typescript
// In src/lib/services/paygroups.service.ts
// Add temporary pay group handling in createPayGroup, updatePayGroup, and deletePayGroup methods
```

### 4. Update UI Components

The UI components will automatically support the new type through the type system. No additional changes are needed for:
- PayGroupCard component
- CreatePayGroupModal component
- PayGroupsPage component
- PayGroupsNavigation component

## Best Practices

### 1. Type Safety
- Always use the defined interfaces and types
- Leverage TypeScript's union types for type safety
- Use type guards when working with union types

### 2. Error Handling
- Use the service layer's validation methods
- Provide specific error messages for users
- Log detailed errors for debugging

### 3. UI/UX
- Follow the established design patterns
- Use consistent animations and transitions
- Provide loading states for all async operations
- Use proper form validation with field-specific errors

### 4. Performance
- Implement proper loading states
- Use React.memo for expensive components
- Optimize database queries with proper indexing
- Use pagination for large datasets

## Future Enhancements

### 1. Advanced Features
- Bulk operations for pay groups
- Import/export functionality
- Advanced filtering and sorting
- Pay group templates

### 2. Integration
- Integration with employee management
- Payroll calculation integration
- Reporting and analytics
- API endpoints for external integrations

### 3. UI Improvements
- Drag and drop for pay group management
- Advanced search with filters
- Pay group comparison tools
- Mobile-responsive improvements

## Testing

### Unit Tests
- Service layer methods
- Type validation functions
- Utility functions

### Integration Tests
- Database operations
- Form submission flows
- Navigation interactions

### E2E Tests
- Complete pay group creation flow
- Pay group management workflows
- Error handling scenarios

## Deployment

The PayGroups module is ready for production deployment. Ensure:

1. Database migrations are run
2. Environment variables are configured
3. RLS policies are properly set up
4. Error monitoring is in place
5. Performance monitoring is configured

## Support

For questions or issues with the PayGroups module:

1. Check the type definitions in `src/lib/types/paygroups.ts`
2. Review the service layer implementation
3. Check the component documentation
4. Refer to the database schema documentation
5. Contact the development team for assistance
