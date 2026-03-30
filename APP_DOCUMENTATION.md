# PayRun Pro - Comprehensive Application Documentation

**Last Updated:** March 26, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Key Features by Module](#key-features-by-module)
6. [Database Schema](#database-schema)
7. [Services Layer](#services-layer)
8. [Hooks & Data Fetching](#hooks--data-fetching)
9. [Components Library](#components-library)
10. [Pages & Routes](#pages--routes)
11. [Supabase Edge Functions](#supabase-edge-functions)
12. [Configuration & Environment](#configuration--environment)
13. [Key Integrations](#key-integrations)
14. [Development Workflow](#development-workflow)
15. [Security & Compliance](#security--compliance)
16. [Recent Enhancements](#recent-enhancements)

---

## Executive Summary

**Application:** PayRun Pro - Enterprise Payroll & HR Management System

**Purpose:** A comprehensive web-based platform for managing employee payroll, attendance, projects, assets, and compliance across multiple organizations and pay groups with advanced features like expatriate management, EHS (Environmental, Health & Safety), and role-based access control.

**Key Statistics:**
- 63+ Page Components
- 300+ React Components
- 45+ Service Modules
- 23 Custom React Hooks
- 49 Supabase Edge Functions
- 148 Database Migrations
- Support for 13+ Feature Modules

**Target Users:**
- HR Managers & Payroll Officers
- Organization Administrators
- Project Managers
- Employees
- Platform Administrators
- Compliance Officers

---

## Tech Stack

### Frontend

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | React | 18.3.1 |
| **Language** | TypeScript | Latest |
| **Build Tool** | Vite | 5.4 |
| **Router** | React Router DOM | 6.30 |
| **Styling** | Tailwind CSS | 3.4 |
| **Component Library** | Shadcn/ui (Radix UI) | Latest |
| **Animations** | Framer Motion | Latest |
| **Form Management** | React Hook Form | 7.61 |
| **Form Validation** | Zod | Latest |
| **Data Fetching** | TanStack React Query | 5.90 |
| **Icons** | Lucide React | Latest |
| **Notifications** | Sonner | Latest |
| **Charts** | Recharts | Latest |
| **Date Utilities** | Date-fns | 3.6 |
| **Carousel** | Embla Carousel | Latest |

### Export & Integration Libraries

| Feature | Library |
|---------|---------|
| Excel Export | XLSX |
| PDF Generation | jsPDF + jsPDF-autotable |
| QR Code Generation | QRCode |
| ZIP Creation | jszip |
| Email Service | Resend API |

### Backend & Database

| Component | Technology |
|-----------|-----------|
| **Backend Framework** | Supabase (PostgreSQL) |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth (JWT-based) |
| **Real-time Sync** | Supabase Realtime |
| **Serverless Functions** | Supabase Edge Functions |
| **Database Security** | Row-Level Security (RLS) |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| TypeScript ESLint | Type-aware linting |
| Dotenv | Environment management |
| Supabase CLI | Database & function management |
| Vite React Plugin (SWC) | Fast JavaScript compilation |

---

## Project Structure

```
payrun-pro-staging/
├── src/
│   ├── pages/                          # 63 page components
│   │   ├── MyDashboard/               # Employee dashboard pages
│   │   ├── ehs/                       # EHS module pages
│   │   ├── assets/                    # Work Assets/Tools pages
│   │   ├── paygroups/                 # Pay group pages
│   │   ├── payruns/                   # Pay run pages
│   │   ├── admin/                     # Admin pages
│   │   ├── onboarding/                # Onboarding flows
│   │   ├── Dashboard.tsx              # Main dashboard
│   │   ├── Projects.tsx               # Project management
│   │   ├── Employees.tsx              # Employee management
│   │   ├── Payroll.tsx                # Payroll tab
│   │   ├── Settings.tsx               # User settings
│   │   └── [Other feature pages]
│   │
│   ├── components/                     # ~300 React components
│   │   ├── ui/                        # Shadcn/ui components (56 files)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── [Other UI primitives]
│   │   ├── payroll/                   # Payroll-specific components
│   │   │   ├── EmployeesTab.tsx
│   │   │   ├── PayGroupsTab.tsx
│   │   │   ├── PayRunsTab.tsx
│   │   │   └── ReportsTab.tsx
│   │   ├── employees/                 # Employee management
│   │   ├── paygroups/                 # Pay group components
│   │   ├── settings/                  # Settings modules (29 files)
│   │   ├── projects/                  # Project components
│   │   ├── assets/                    # Asset management
│   │   ├── expatriate/                # Expatriate payroll
│   │   ├── attendance/                # Attendance tracking
│   │   ├── auth/                      # Auth components
│   │   ├── timesheets/                # Timesheet components
│   │   ├── ehs/                       # EHS module
│   │   ├── payslip/                   # Payslip generation
│   │   ├── admin/                     # Admin components
│   │   ├── rbac/                      # RBAC components
│   │   ├── navigation/                # Navigation components
│   │   └── [Other feature modules]
│   │
│   ├── hooks/                          # Custom React hooks (23 files)
│   │   ├── use-auth.tsx
│   │   ├── use-supabase-auth.tsx
│   │   ├── use-employees.ts
│   │   ├── use-paygroups.ts
│   │   ├── use-payruns.ts
│   │   ├── use-rbac-permissions.ts
│   │   ├── use-user-role.ts
│   │   ├── usePagination.ts
│   │   └── [Other data hooks]
│   │
│   ├── lib/
│   │   ├── services/                  # Business logic services (45+ files)
│   │   │   ├── paygroups.service.ts
│   │   │   ├── payruns.service.ts
│   │   │   ├── employees.service.ts
│   │   │   ├── expatriate-payroll.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── assets.service.ts
│   │   │   ├── ehs.service.ts
│   │   │   ├── workflow.service.ts
│   │   │   ├── user-management.ts
│   │   │   ├── zoho-books.service.ts
│   │   │   ├── payslip-generator.ts
│   │   │   └── [Other services]
│   │   ├── types/                     # TypeScript definitions (13 files)
│   │   ├── data/                      # Data services & query clients
│   │   ├── constants/                 # App constants (countries, deductions, etc.)
│   │   ├── api/                       # API helpers
│   │   ├── validations/               # Zod schemas
│   │   ├── tenant/                    # Multi-tenancy context
│   │   └── utils/                     # Utility functions
│   │
│   ├── integrations/
│   │   └── supabase/                  # Supabase client & types
│   │
│   ├── layouts/
│   │   └── MainLayout.tsx
│   │
│   ├── styles/
│   │   └── index.css                  # Global styles
│   │
│   ├── App.tsx                        # Main router & context setup
│   ├── main.tsx                       # React root entry point
│   └── index.css                      # Global styling
│
├── supabase/                           # Backend infrastructure
│   ├── migrations/                    # 148 database migrations (~25K+ lines SQL)
│   │   ├── [001-100]/                 # Core & structural migrations
│   │   ├── [101-148]/                 # Feature & enhancement migrations
│   │   └── [Migrations for: users, employees, payroll, attendance, etc.]
│   │
│   ├── functions/                     # 49 serverless Edge Functions
│   │   ├── calculate-pay/             # Payroll calculation
│   │   ├── calculate-expatriate-pay/  # Expatriate calculations
│   │   ├── manage-payruns/            # Pay run operations
│   │   ├── manage-payitems/           # Pay item management
│   │   ├── invite-user/               # User invitations
│   │   ├── invite-org-user/           # Org user invitations
│   │   ├── manage-users/              # User management
│   │   ├── platform-admin-*/          # 8+ platform admin functions
│   │   ├── create-platform-user/      # Platform user creation
│   │   ├── ehs-notifications/         # EHS alerts
│   │   ├── generate-ura-paye-return/  # Tax return generation
│   │   ├── database-health-monitor/   # Health checks
│   │   └── [Other automated functions]
│   │
│   ├── config.toml                    # Supabase configuration
│   └── schemas/                       # Database schemas & types
│
├── Configuration Files
│   ├── vite.config.ts                 # Vite build config
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── tailwind.config.ts             # Tailwind CSS config
│   ├── package.json                   # Dependencies & scripts
│   ├── .env                           # Staging environment
│   ├── .env.local                     # Local overrides
│   ├── .env.staging                   # Staging vars
│   ├── .env.production                # Production vars
│   └── .env.next                      # Next.js build env
│
└── Documentation
    ├── COMPREHENSIVE_DOCS.md
    ├── DATABASE_MIGRATION_GUIDE.md
    ├── COMPLETE_MIGRATION_SOLUTION.md
    └── APP_DOCUMENTATION.md           # This file
```

---

## Architecture & Design Patterns

### Multi-Layered Architecture

```
┌─────────────────────────────────────────┐
│  Pages Layer                             │
│  (63+ page components - UI interfaces)  │
├─────────────────────────────────────────┤
│  Components Layer                        │
│  (300+ reusable React components)       │
├─────────────────────────────────────────┤
│  Hooks Layer                             │
│  (Data access & state management)       │
├─────────────────────────────────────────┤
│  Services Layer                          │
│  (45+ business logic services)          │
├─────────────────────────────────────────┤
│  Supabase Backend                        │
│  (PostgreSQL, Auth, Realtime, Functions)│
└─────────────────────────────────────────┘
```

### Multi-Tenancy Implementation

- **Isolation:** Organization-based isolation via Row-Level Security (RLS)
- **Context:** OrgContext for tenant switching
- **Authentication:** Users belong to organizations; access controlled by RLS policies
- **Data:** All queries filtered by organization at database level

### Authentication & Authorization

**Dual Auth System:**
- **Primary:** Supabase Auth (email/password, SSO)
- **Legacy:** Legacy auth provider (for backward compatibility)

**RBAC (Role-Based Access Control):**
- Role definitions per organization
- Permission mapping
- Module-level access control
- User role assignments
- Permission inheritance

**Access Flow:**
```
User Login → Supabase JWT → Use-rbac-permissions Hook →
Route Guards → Component Visibility → API Call with RLS Enforcement
```

### Real-Time Features Architecture

- **Subscription Service:** RealtimeService manages Supabase subscriptions
- **Live Updates:** Real-time table changes propagate to UI
- **Change Detection:** Automatic UI updates when data changes
- **Supported Tables:** Employees, Pay Runs, Attendance, Assets, etc.

### State Management

**Server State:**
- **React Query (TanStack):** Manages API data caching, synchronization, and mutations
- **Custom Hooks:** Encapsulate query logic (useEmployees, usePaygroups, usePayruns, etc.)
- **Real-time Sync:** Automatic subscriptions for live updates

**UI State:**
- **React Context:** Theme, Auth, Organization context
- **React Hook Form:** Form state with validation
- **Component State:** Local useState for UI interactions

### Service Layer Pattern

Each service exports:
```typescript
// Example: paygroups.service.ts
export const PaygroupsService = {
  list: async () => {},
  create: async (data) => {},
  update: async (id, data) => {},
  delete: async (id) => {},
  addMembers: async (paygroupId, memberIds) => {},
  // ... other operations
}
```

Services handle:
- API communication with Supabase
- Data transformation & validation
- Business logic
- Error handling
- Side effects

---

## Key Features by Module

### 1. Payroll Core

**Features:**
- ✅ Employee Management (CRUD, profiles, bank details)
- ✅ Pay Groups (organize employees: Regular, Expatriate, Interns, etc.)
- ✅ Pay Items (deductions, allowances, taxes)
- ✅ Pay Runs (process & manage payroll cycles)
- ✅ Payslip Generation (PDF export, email distribution)
- ✅ Multi-paygroup Support (Head Office + Projects)
- ✅ Salary Structure Management
- ✅ Deduction Rules
- ✅ Tax Calculations
- ✅ Leave Management Integration

**Key Files:**
- `src/pages/Payroll.tsx`
- `src/pages/paygroups/`
- `src/pages/payruns/`
- `src/lib/services/paygroups.service.ts`
- `src/lib/services/payruns.service.ts`
- `src/lib/services/payslip-generator.ts`
- `supabase/functions/calculate-pay/`

### 2. Expatriate Module

**Features:**
- ✅ Uganda Compliance Logic
- ✅ Work Permits Management
- ✅ Expatriate-Specific Payroll Calculations
- ✅ Tax & Compliance Reporting
- ✅ 4-Tab Project UI (Details, Compliance, Tax, Documents)
- ✅ Residence Status Tracking
- ✅ Expatriate Tax Thresholds

**Key Files:**
- `src/pages/ExpatriatePayrollPage.tsx`
- `src/components/expatriate/`
- `src/lib/services/expatriate-payroll.ts`
- `supabase/functions/calculate-expatriate-pay/`

### 3. Attendance & Time Tracking

**Features:**
- ✅ QR Code-Based Attendance (AttendQr system)
- ✅ Manual Attendance Entry
- ✅ Geofencing Support
- ✅ Timesheet Management
- ✅ Attendance Anomaly Detection & Alerts
- ✅ Leave & Absence Tracking
- ✅ Late Coming Tracking
- ✅ Attendance Reports

**Key Files:**
- `src/pages/AttendQr.tsx`
- `src/pages/Timesheets.tsx`
- `src/pages/Anomalies.tsx`
- `src/components/attendance/`
- `src/lib/services/attendance.service.ts`

### 4. Assets & Work Tools

**Features:**
- ✅ Asset Management (create, track, assign)
- ✅ Asset Categorization
- ✅ Permission-Gated Financials
- ✅ XLSX Export Functionality
- ✅ Asset Depreciation Tracking
- ✅ Asset Lifecycle Management

**Key Files:**
- `src/pages/Assets.tsx`
- `src/components/assets/`
- `src/lib/services/assets.service.ts`
- `src/lib/services/assets-exporter.ts`

### 5. Projects Module

**Features:**
- ✅ Project Creation & Management
- ✅ Project-Specific Payroll Types:
  - IPPMS (Integration & Project Performance)
  - Manpower Daily/BiWeekly/Monthly
  - Other custom pay groups
- ✅ Project Member Management
- ✅ Project Attendance Tracking
- ✅ Project Financial Tracking
- ✅ Budget vs. Actual Reports

**Key Files:**
- `src/pages/Projects.tsx`
- `src/components/projects/`
- `src/lib/services/projects.service.ts`

### 6. User & Access Management

**Features:**
- ✅ Role-Based Access Control (RBAC)
- ✅ Two-Panel Permissions UI
- ✅ Module-Level Access Control
- ✅ Invite System with Email
- ✅ SELF_USER Portal Support
- ✅ Employee Invite Button
- ✅ Organization Hierarchy Management
- ✅ User Role Assignments
- ✅ Device Management
- ✅ Session Management

**Key Files:**
- `src/pages/UsersManagement.tsx`
- `src/components/rbac/`
- `src/lib/services/user-management.ts`
- `src/lib/api/rbac.ts`
- `src/hooks/use-rbac-permissions.ts`
- `supabase/functions/invite-user/`
- `supabase/functions/invite-org-user/`

### 7. Admin & Compliance

**Features:**
- ✅ Platform Admin Dashboard
- ✅ Organization Management
- ✅ License Management
- ✅ Audit Logs & Activity Tracking
- ✅ Security Settings
- ✅ Device Management
- ✅ User Activity Monitoring

**EHS (Environment, Health & Safety) Module:**
- ✅ Incident Tracking & Reporting
- ✅ Hazard Identification & Assessment
- ✅ Safety Inspections
- ✅ Training Records Management
- ✅ Compliance Reports
- ✅ Near-Miss Reporting
- ✅ Risk Assessment Matrix

**Key Files:**
- `src/pages/admin/`
- `src/pages/PlatformAdminDashboard.tsx`
- `src/components/ehs/`
- `src/lib/services/ehs.service.ts`
- `src/lib/services/ehs-phase2.service.ts`

### 8. Integrations

**Features:**
- ✅ Supabase Integration (Auth, DB, Realtime)
- ✅ Zoho Books Integration (Accounting sync)
- ✅ Email Notifications (via Resend)
- ✅ Bank Schedule Integration
- ✅ QR Code Generation
- ✅ PDF Export & Generation
- ✅ Excel (XLSX) Export

**Key Files:**
- `src/lib/services/zoho-books.service.ts`
- `src/integrations/supabase/`
- `src/lib/services/payslip-generator.ts` (PDF generation)

### 9. Advanced Features

**Workflow Management:**
- Approval workflows
- Multi-level approvals
- Workflow state tracking

**Notifications:**
- In-app notifications
- Email notifications
- Push notifications

**Reporting:**
- Payroll reports
- Tax reports
- Attendance reports
- Asset reports
- EHS reports
- Compliance reports

**Data Export:**
- PDF payslips
- Excel reports
- Batch exports
- Scheduled exports

---

## Database Schema

### Key Tables Overview

#### Authentication & Users
| Table | Purpose |
|-------|---------|
| `users` | Supabase Auth integrated users |
| `user_profiles` | Extended user information |
| `user_invitations` | Pending user invites |
| `audit_logs` | Activity tracking |

#### Organization & Access
| Table | Purpose |
|-------|---------|
| `organizations` / `companies` | Organization data |
| `user_roles` | User role assignments |
| `rbac_roles` | Role definitions |
| `rbac_permissions` | Permission definitions |
| `rbac_role_permissions` | Role-permission mapping |

#### Payroll Core
| Table | Purpose |
|-------|---------|
| `employees` | Employee master data |
| `pay_groups` | Pay group definitions |
| `pay_group_members` | Employee-paygroup mapping |
| `pay_items` | Deductions & allowances |
| `pay_runs` | Payroll cycle records |
| `pay_run_employees` | Employee payroll details per run |
| `payslips` | Generated payslips |
| `salary_structures` | Salary templates |

#### Projects
| Table | Purpose |
|-------|---------|
| `projects` | Project definitions |
| `project_members` | Project team assignments |
| `project_pay_groups` | Project payroll groups |

#### Time & Attendance
| Table | Purpose |
|-------|---------|
| `attendance_records` | Daily attendance entries |
| `timesheets` | Timesheet submissions |
| `leave_requests` | Leave applications |
| `anomalies` | Attendance anomaly flags |

#### Assets & Tools
| Table | Purpose |
|-------|---------|
| `assets` / `work_tools` | Asset inventory |
| `asset_assignments` | Employee-asset mapping |
| `asset_depreciation` | Asset value tracking |

#### Expatriate Management
| Table | Purpose |
|-------|---------|
| `expatriate_records` | Expatriate profile data |
| `work_permits` | Work permit tracking |
| `expatriate_tax` | Tax calculations & records |

#### EHS Module
| Table | Purpose |
|-------|---------|
| `ehs_incidents` | Incident reports |
| `ehs_hazards` | Hazard assessments |
| `ehs_inspections` | Safety inspections |
| `ehs_training` | Training records |

#### Workflows & Approvals
| Table | Purpose |
|-------|---------|
| `workflows` | Workflow definitions |
| `approvals` | Approval requests |
| `audit_logs` | System audit trail |

### Authentication & Authorization

**Supabase Auth Features:**
- JWT-based session management
- Email/password authentication
- SSO support
- Row-Level Security (RLS) for data isolation
- Real-time subscriptions for live updates

**RLS Implementation:**
- Every table has RLS policies
- Access controlled by organization
- User roles determine data visibility
- Queries automatically filtered at database level

---

## Services Layer

### Overview

The services layer encapsulates business logic and API communication. Each service provides methods for CRUD operations and domain-specific operations.

### Services List (45+ Services)

| Service | File | Purpose |
|---------|------|---------|
| **Paygroups** | `paygroups.service.ts` | Pay group CRUD & member management |
| **Payruns** | `payruns.service.ts` | Payroll processing & management |
| **Employees** | `employees.service.ts` | Employee data management |
| **Expatriate Payroll** | `expatriate-payroll.ts` | Expatriate-specific calculations |
| **Attendance** | `attendance.service.ts` | Attendance tracking & validation |
| **Payslip Generator** | `payslip-generator.ts` | Payslip creation & PDF export |
| **User Management** | `user-management.ts` | User & permission operations |
| **Projects** | `projects.service.ts` | Project CRUD & member management |
| **Assets** | `assets.service.ts` | Asset inventory management |
| **Assets Exporter** | `assets-exporter.ts` | XLSX export functionality |
| **EHS (Phase 1)** | `ehs.service.ts` | EHS core operations |
| **EHS (Phase 2)** | `ehs-phase2.service.ts` | EHS advanced features |
| **Workflow** | `workflow.service.ts` | Approval workflow management |
| **Zoho Books** | `zoho-books.service.ts` | Accounting integration |
| **Notifications** | `notifications.service.ts` | Email & in-app notifications |
| **Security** | `security.service.ts` | Security & audit operations |
| **License** | `license.service.ts` | License management |
| **Admin** | `admin.service.ts` | Admin operations |
| **Diagnostics** | `diagnostics.service.ts` | Health & diagnostics |
| **Timesheets** | `timesheets.service.ts` | Timesheet management |
| **Leave** | `leave.service.ts` | Leave management |
| **Bank Integration** | `bank.service.ts` | Bank schedule integration |
| [And more...] | | |

### Example Service Structure

```typescript
// src/lib/services/paygroups.service.ts

export const PaygroupsService = {
  // Read operations
  list: async (orgId: string) => {
    const { data } = await supabase
      .from('pay_groups')
      .select('*')
      .eq('org_id', orgId);
    return data;
  },

  // Create operations
  create: async (orgId: string, data: CreatePaygroupDTO) => {
    const { data: result } = await supabase
      .from('pay_groups')
      .insert({
        ...data,
        org_id: orgId,
      });
    return result;
  },

  // Update operations
  update: async (id: string, data: UpdatePaygroupDTO) => {
    const { data: result } = await supabase
      .from('pay_groups')
      .update(data)
      .eq('id', id);
    return result;
  },

  // Delete operations
  delete: async (id: string) => {
    await supabase
      .from('pay_groups')
      .delete()
      .eq('id', id);
  },

  // Custom operations
  addMembers: async (paygroupId: string, memberIds: string[]) => {
    // Batch insert employee-paygroup mappings
  },

  removeMembers: async (paygroupId: string, memberIds: string[]) => {
    // Batch delete from pay_group_members
  },
};
```

---

## Hooks & Data Fetching

### Custom React Hooks (23 Total)

| Hook | File | Purpose |
|------|------|---------|
| **useAuth** | `use-auth.tsx` | Authentication context & login/logout |
| **useSupabaseAuth** | `use-supabase-auth.tsx` | Supabase Auth integration |
| **useEmployees** | `use-employees.ts` | Employee list & CRUD operations |
| **usePaygroups** | `use-paygroups.ts` | Pay group data & mutations |
| **usePayruns** | `use-payruns.ts` | Pay run data & operations |
| **useRbacPermissions** | `use-rbac-permissions.ts` | Permission checking |
| **useUserRole** | `use-user-role.ts` | Current user's role info |
| **usePagination** | `usePagination.ts` | Table pagination |
| **useAttendance** | `use-attendance.ts` | Attendance data |
| **useTimesheets** | `use-timesheets.ts` | Timesheet management |
| **useProjects** | `use-projects.ts` | Project data |
| **useAssets** | `use-assets.ts` | Asset management |
| **useOrganization** | `use-organization.ts` | Org context |
| **useTheme** | `use-theme.ts` | Theme switching |
| **useRealtimeSync** | `use-realtime-sync.ts` | Real-time subscriptions |
| [And 8 more...] | | |

### Data Fetching Pattern

```typescript
// Example: useEmployees hook

import { useQuery, useMutation } from '@tanstack/react-query';
import { EmployeesService } from '@/lib/services/employees.service';

export const useEmployees = (orgId: string) => {
  // Query for fetching employees
  const query = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => EmployeesService.list(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating employee
  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeDTO) =>
      EmployeesService.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['employees', orgId],
      });
    },
  });

  return {
    employees: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
```

### Real-Time Subscriptions

```typescript
// Real-time subscription for live updates
useEffect(() => {
  const subscription = supabase
    .from('employees')
    .on('*', (payload) => {
      // Handle INSERT, UPDATE, DELETE
      queryClient.invalidateQueries({
        queryKey: ['employees'],
      });
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Components Library

### Overview

The application contains **300+ React components** organized by feature and functionality.

### UI Components (56 Shadcn/ui Components)

Located in `src/components/ui/`

**Form Components:**
- `button.tsx` - Styled button
- `input.tsx` - Text input
- `form.tsx` - Form wrapper
- `textarea.tsx` - Multi-line input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox input
- `radio-group.tsx` - Radio buttons
- `switch.tsx` - Toggle switch

**Display Components:**
- `table.tsx` - Data table
- `card.tsx` - Card container
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars
- `progress.tsx` - Progress bars
- `skeleton.tsx` - Loading skeletons

**Dialog Components:**
- `dialog.tsx` - Modal dialog
- `alert-dialog.tsx` - Alert dialog
- `drawer.tsx` - Side drawer
- `popover.tsx` - Popover menu

**Navigation Components:**
- `tabs.tsx` - Tab interface
- `breadcrumb.tsx` - Breadcrumb navigation
- `dropdown-menu.tsx` - Dropdown menu
- `navigation-menu.tsx` - Navigation menu

**Feedback Components:**
- `toast.tsx` - Toast notifications (via Sonner)
- `toaster.tsx` - Toast container
- `tooltip.tsx` - Hover tooltips

**Layout Components:**
- `scroll-area.tsx` - Scrollable area
- `separator.tsx` - Divider line
- `command.tsx` - Command palette

**Chart Components:**
- Recharts integration for data visualization

### Feature Components

#### Payroll Components (50+ files)
- `EmployeesTab.tsx` - Employee list & management
- `PayGroupsTab.tsx` - Pay groups interface
- `PayRunsTab.tsx` - Pay run processing
- `ReportsTab.tsx` - Payroll reports
- `PayslipViewer.tsx` - Payslip display
- `SalaryStructureForm.tsx` - Salary setup
- `DeductionManager.tsx` - Deductions UI
- `PayItemSelector.tsx` - Pay item selection

#### Settings Components (29 files)
- `GeneralSettings.tsx` - Organization settings
- `UserSettings.tsx` - User preferences
- `SecuritySettings.tsx` - Security configuration
- `IntegrationSettings.tsx` - Third-party integrations
- `NotificationSettings.tsx` - Notification preferences
- `BankingSettings.tsx` - Bank account configuration
- `TaxSettings.tsx` - Tax configuration

#### RBAC Components
- `PermissionsPanel.tsx` - Permissions UI
- `RoleManager.tsx` - Role management
- `UserAccessControl.tsx` - Access control
- `InviteUser.tsx` - User invitation
- `ModuleAccess.tsx` - Module permissions

#### Other Feature Components
- **Employees:** `EmployeeForm.tsx`, `EmployeeProfile.tsx`, `EmployeeList.tsx`
- **Projects:** `ProjectForm.tsx`, `ProjectTeam.tsx`, `ProjectPayroll.tsx`
- **Attendance:** `AttendanceForm.tsx`, `AttendanceList.tsx`, `AnomalyAlert.tsx`
- **Assets:** `AssetForm.tsx`, `AssetList.tsx`, `AssetAssignment.tsx`
- **EHS:** `IncidentForm.tsx`, `HazardAssessment.tsx`, `InspectionReport.tsx`
- **Expatriate:** `ExpatriateForm.tsx`, `WorkPermitStatus.tsx`, `ComplianceCheck.tsx`
- **Admin:** `AdminDashboard.tsx`, `UserManagement.tsx`, `AuditLog.tsx`

### Component Organization

```
src/components/
├── ui/                    # Shadcn/ui primitives
├── payroll/              # Payroll-specific components
├── employees/            # Employee management
├── paygroups/            # Pay group components
├── settings/             # Settings UI (29 files)
├── projects/             # Project components
├── assets/               # Asset management
├── expatriate/           # Expatriate module
├── attendance/           # Attendance components
├── auth/                 # Auth-related components
├── timesheets/           # Timesheet components
├── ehs/                  # EHS module components
├── payslip/              # Payslip components
├── admin/                # Admin components
├── rbac/                 # RBAC components
├── navigation/           # Navigation components
├── notifications/        # Notification components
├── modals/               # Modal dialogs
├── forms/                # Form components
├── tables/               # Table components
└── common/               # Common reusable components
```

---

## Pages & Routes

### Complete Route Tree (60+ Pages)

#### Public Routes
```
GET  /                    → Index (landing page)
GET  /login               → Login page
GET  /signup              → Sign up page
GET  /forgot-password     → Password reset
GET  /accept-invite/:token → Invite acceptance
GET  /set-password/:token → Password setup
```

#### Authenticated Routes
```
GET  /dashboard               → Main dashboard
GET  /employees               → Employee list
GET  /employees/:id           → Employee detail
GET  /paygroups               → Pay groups
GET  /paygroups/:id           → Pay group detail
GET  /payruns                 → Pay runs list
GET  /payruns/:id             → Pay run detail
GET  /projects                → Projects list
GET  /projects/:id            → Project detail
GET  /projects/:id/payroll    → Project payroll
GET  /projects/:id/team       → Project team
GET  /projects/:id/attendance → Project attendance
GET  /timesheets              → Timesheet list
GET  /timesheets/:id          → Timesheet detail
GET  /attendance              → Attendance tracking
GET  /attendance/qr           → QR attendance (AttendQr)
GET  /assets                  → Assets list
GET  /assets/:id              → Asset detail
GET  /settings                → User settings
GET  /settings/general        → General settings
GET  /settings/security       → Security settings
GET  /settings/notifications  → Notification settings
GET  /settings/integrations   → Integration settings
```

#### Admin Routes
```
GET  /admin                   → Admin dashboard
GET  /admin/users             → User management
GET  /admin/organizations     → Org management
GET  /admin/licenses          → License management
GET  /admin/audit-logs        → Audit logs
GET  /admin/diagnostics       → Diagnostics
GET  /super-admin             → Platform admin
GET  /super-admin/users       → Platform user management
GET  /super-admin/organizations → Platform org management
```

#### Feature Routes
```
GET  /payroll                 → Payroll hub
GET  /payroll/employees       → Employees tab
GET  /payroll/paygroups       → Pay groups tab
GET  /payroll/payruns         → Pay runs tab
GET  /payroll/reports         → Reports tab
GET  /expatriate              → Expatriate payroll
GET  /expatriate/:id          → Expatriate detail
GET  /ehs                     → EHS dashboard
GET  /ehs/incidents           → Incidents
GET  /ehs/hazards             → Hazards
GET  /ehs/inspections         → Inspections
GET  /ehs/training            → Training records
GET  /approvals               → My approvals
GET  /anomalies               → Attendance anomalies
GET  /onboarding              → Onboarding flow
```

#### My Dashboard Routes
```
GET  /my-dashboard            → Employee dashboard
GET  /my-dashboard/payslips   → My payslips
GET  /my-dashboard/timesheets → My timesheets
GET  /my-dashboard/attendance → My attendance
GET  /my-dashboard/leave      → My leave requests
GET  /my-dashboard/profile    → My profile
```

### Route Protection

Routes are protected by:
1. **Authentication Guard** - Requires valid JWT
2. **Permission Guard** - Checks RBAC permissions
3. **Organization Guard** - Validates org membership
4. **Role Guard** - Validates user role

```typescript
// Example: Protected route with role check
<Route
  path="/admin/users"
  element={<AdminRoute requiredRole="admin" children={<UserManagement />} />}
/>
```

---

## Supabase Edge Functions

### Overview

49 serverless functions handling automated tasks, calculations, and integrations.

### Function Categories

#### Payroll Calculation (3 functions)
| Function | Purpose |
|----------|---------|
| `calculate-pay` | Standard payroll calculation |
| `calculate-expatriate-pay` | Expatriate-specific calculations |
| `manage-payruns` | Pay run creation & processing |

#### User Management (4 functions)
| Function | Purpose |
|----------|---------|
| `invite-user` | Send user invitation email |
| `invite-org-user` | Invite to organization |
| `manage-users` | User CRUD operations |
| `create-platform-user` | Platform user creation |

#### Admin Operations (8+ functions)
| Function | Purpose |
|----------|---------|
| `platform-admin-create-org` | Create organization |
| `platform-admin-manage-licenses` | License management |
| `platform-admin-audit` | Audit operations |
| `platform-admin-*` | Other admin tasks |

#### Pay Item Management (2 functions)
| Function | Purpose |
|----------|---------|
| `manage-payitems` | Create/update pay items |
| `delete-payitems` | Delete pay items |

#### Notifications & Alerts (3 functions)
| Function | Purpose |
|----------|---------|
| `ehs-notifications` | EHS alert sending |
| `email-notifications` | Email dispatch |
| `notification-scheduler` | Schedule notifications |

#### Reporting & Export (2 functions)
| Function | Purpose |
|----------|---------|
| `generate-ura-paye-return` | Tax return generation (Uganda) |
| `generate-reports` | Report generation |

#### Monitoring & Health (2 functions)
| Function | Purpose |
|----------|---------|
| `database-health-monitor` | Database health checks |
| `system-diagnostics` | System diagnostics |

#### Other Functions (24 functions)
- Attendance processing
- Timesheet validation
- Leave request handling
- Asset management
- Workflow automation
- Integration handlers
- Data migration functions
- Cache warming
- Scheduled jobs

### Function Structure

```typescript
// Example: supabase/functions/calculate-pay/index.ts

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const { payRunId, employeeIds } = await req.json()

    // Fetch pay run details
    const { data: payRun } = await supabase
      .from('pay_runs')
      .select('*')
      .eq('id', payRunId)
      .single()

    // Calculate pay for each employee
    for (const employeeId of employeeIds) {
      const calculation = performPayCalculation(
        payRun,
        employeeId
      )

      // Store calculation
      await supabase
        .from('pay_run_employees')
        .upsert(calculation)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Configuration & Environment

### Environment Files

#### `.env` (Staging - Current)
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_APP_MODE=staging
VITE_BANK_INTEGRATION_ENABLED=true
VITE_ZOHO_BOOKS_ENABLED=true
```

#### `.env.local` (Local Development)
```env
# Local overrides for development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=local-anon-key
VITE_APP_MODE=development
```

#### `.env.staging`
Production-like staging environment settings

#### `.env.production`
Production environment settings with:
- Production Supabase project
- Optimized logging
- Error tracking
- Analytics

### Build Configuration

#### `vite.config.ts`
```typescript
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}
```

**Key Features:**
- React SWC plugin for fast compilation
- Path alias `@/` for imports
- Dev server with proxy
- Optimized build output

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "jsx": "react-jsx"
  }
}
```

### Styling Configuration

#### `tailwind.config.ts`
```typescript
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Status colors
        status: {
          active: "#10b981",
          pending: "#f59e0b",
          inactive: "#6b7280",
          error: "#ef4444",
        },
        // Brand colors
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          900: "#1e3a8a",
        },
        // Component colors
        sidebar: "#1f2937",
        card: "#ffffff",
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideIn: "slideIn 0.3s ease-in-out",
      },
    },
  },
}
```

**Custom Colors:**
- Status colors for employee states
- Primary brand colors
- Sidebar & card colors
- Component-specific colors

### Supabase Configuration

#### `supabase/config.toml`
```toml
[project]
project_id = "xxxxx"
account_id = "xxxxx"
db_dialect = "postgres"

[api]
enabled = true
port = 54321

[auth]
enabled = true
jwt_expiry_sec = 3600

[realtime]
enabled = true
ip_version = "IPv4"

[functions]
js_runtime = "deno"
```

---

## Key Integrations

### 1. Supabase Ecosystem

**Components:**
- **PostgreSQL Database** - Primary data store
- **Supabase Auth** - User authentication
- **Supabase Realtime** - Live data subscriptions
- **Edge Functions** - Serverless processing
- **Supabase Storage** - File storage (if used)

**Usage:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, anonKey)

// Authentication
await supabase.auth.signInWithPassword({ email, password })

// Data operations
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('org_id', orgId)

// Real-time subscriptions
supabase.from('pay_runs').on('*', handleChange).subscribe()
```

### 2. Zoho Books Integration

**Purpose:** Accounting system synchronization

**Features:**
- Invoice generation
- Payroll expense tracking
- Financial reporting
- Multi-currency support

**Implementation File:** `src/lib/services/zoho-books.service.ts`

**Configuration:**
- API credentials via environment
- OAuth authentication
- Webhook handlers for sync

### 3. Email Service (Resend)

**Purpose:** Email delivery for notifications, invites, payslips

**Features:**
- Email templating
- Batch sending
- Delivery tracking
- Open/click analytics

**Implementation:**
```typescript
import { Resend } from 'resend'

const resend = new Resend(apiKey)

await resend.emails.send({
  from: 'noreply@payrunpro.com',
  to: employee.email,
  subject: 'Your Payslip',
  html: payslipHtml,
  attachments: [{ filename: 'payslip.pdf', content: pdfBuffer }],
})
```

### 4. QR Code Generation

**Purpose:** Attendance tracking via QR codes

**Library:** `qrcode`

**Implementation:**
```typescript
import QRCode from 'qrcode'

const qrDataUrl = await QRCode.toDataURL(attendanceData, {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  width: 300,
})
```

### 5. PDF Generation

**Libraries:**
- `jsPDF` - PDF creation
- `jsPDF-autotable` - Table generation

**Use Cases:**
- Payslip generation
- Reports export
- Compliance documents

**Example:**
```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const doc = new jsPDF()

autoTable(doc, {
  head: [['Name', 'Gross', 'Deductions', 'Net']],
  body: payslipData,
})

doc.save('payslips.pdf')
```

### 6. Excel Export

**Library:** `XLSX`

**Use Cases:**
- Payroll export
- Asset listing
- Reports
- Data backup

**Implementation:**
```typescript
import XLSX from 'xlsx'

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(data)
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
XLSX.writeFile(wb, 'export.xlsx')
```

### 7. Bank Integration

**Purpose:** Salary schedule creation, bank file format compliance

**Supported Formats:**
- Standard bank CSV
- Local bank formats (Uganda-specific)
- ACH/EFT formats

---

## Development Workflow

### Setup & Installation

```bash
# Clone repository
git clone <repo-url>
cd payrun-pro-staging

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start Supabase (Docker)
supabase start

# Run dev server
npm run dev
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run format` | Format code with Prettier |

### Database Migrations

```bash
# Create new migration
supabase migration new <migration-name>

# Run migrations
supabase migration up

# Rollback
supabase migration down
```

**Migration Files Location:** `supabase/migrations/`

**Current:** 148 migrations applied

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "Add feature"

# Push and create PR
git push origin feature/feature-name
```

### Testing

```bash
# Run tests (if configured)
npm run test

# Run tests with coverage
npm run test:coverage
```

---

## Security & Compliance

### Authentication & Authorization

**Multi-Layer Security:**

1. **Authentication Layer**
   - Supabase JWT tokens
   - Email/password or SSO
   - Token refresh mechanism
   - Secure session storage

2. **Authorization Layer**
   - Role-Based Access Control (RBAC)
   - Permission checking
   - Module-level access
   - Organization isolation

3. **Data Access Layer**
   - Row-Level Security (RLS) policies
   - Automatic query filtering
   - Tenant isolation
   - Secure API endpoints

### Row-Level Security (RLS)

**Implementation:**
```sql
-- Example: Employees table RLS policy
CREATE POLICY org_isolation ON employees
  FOR SELECT
  USING (org_id = auth.uid()::uuid);

CREATE POLICY insert_own_org ON employees
  FOR INSERT
  WITH CHECK (org_id = auth.uid()::uuid);
```

**Effect:**
- Queries automatically filtered by organization
- Users cannot access other organizations' data
- Database enforces isolation

### Audit Logging

**Tracked Events:**
- User login/logout
- Data modifications (create, update, delete)
- Permission changes
- Admin actions
- System errors

**Storage:** `audit_logs` table with:
- User ID
- Action type
- Resource
- Timestamp
- Changes made

### Compliance Features

**License Management:**
- License tracking per organization
- Feature enablement based on license
- Usage monitoring
- Compliance reporting

**Device Management:**
- Device registration
- Session management
- Login device tracking
- Suspicious activity alerts

**Data Security:**
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS)
- Secure password storage (bcrypt)
- API key rotation support

### Uganda-Specific Compliance

**Expatriate Module:**
- Work permit tracking
- Compliance with Uganda employment law
- Tax filing support (URA PAYE returns)
- Residence status verification

---

## Recent Enhancements

Based on recent git commits (March 2026):

### 1. Assets Module & XLSX Export
- ✅ Work Tools / Asset Management module
- ✅ `/assets` route implementation
- ✅ Permission-gated financials
- ✅ XLSX export functionality
- ✅ Asset tracking & lifecycle

**Commit:** b9603a3
**File:** `src/lib/services/assets-exporter.ts`

### 2. Zoho Books Integration
- ✅ Accounting system synchronization
- ✅ Invoice generation support
- ✅ Financial report sync
- ✅ Multi-currency support

**Commit:** b9603a3
**File:** `src/lib/services/zoho-books.service.ts`

### 3. QR Attendance System
- ✅ QR code generation for attendance
- ✅ Mobile scanning support
- ✅ Instant attendance marking
- ✅ QR code management interface

**Commit:** b9603a3
**File:** `src/pages/AttendQr.tsx`

### 4. Geofencing Support
- ✅ Location-based attendance validation
- ✅ Geofence setup per location
- ✅ Attendance anomaly detection
- ✅ Out-of-bounds alerts

**Commit:** b9603a3

### 5. Permissions Overhaul
- ✅ Two-panel permissions UI redesign
- ✅ Module-level access control in invites
- ✅ SELF_USER portal support
- ✅ Employee invite button
- ✅ Enhanced permission management

**Commit:** b9603a3
**Files:** `src/components/rbac/*`

### 6. Expatriate Management Enhancements
- ✅ Uganda compliance logic
- ✅ Work permits tracking
- ✅ 4-tab project UI
- ✅ Tax calculation improvements
- ✅ Compliance reporting

**Commit:** b9603a3
**File:** `src/lib/services/expatriate-payroll.ts`

### 7. Email Trigger Refinements
- ✅ Disabled legacy email triggers (v1)
- ✅ Optimized notification delivery
- ✅ Email template improvements
- ✅ Limited emails to current level

**Commits:** 463febb, a5288cd

---

## Architecture Highlights

### Scalability Features

1. **Database Indexing** - Optimized for large datasets
2. **Query Caching** - React Query with configurable stale time
3. **Real-time Sync** - Efficient subscription management
4. **Pagination** - Server-side pagination for large lists
5. **Batch Operations** - Bulk CRUD support

### Performance Optimizations

1. **Code Splitting** - Route-based lazy loading
2. **Component Memoization** - React.memo for expensive renders
3. **Image Optimization** - Responsive image loading
4. **CSS Optimization** - Tailwind purging unused styles
5. **Bundle Optimization** - Tree-shaking of unused code

### Developer Experience

1. **TypeScript** - Full type safety
2. **Hot Module Replacement (HMR)** - Instant feedback
3. **Path Aliases** - Clean imports (`@/`)
4. **ESLint** - Code consistency
5. **Component Documentation** - Self-documenting UI

---

## File Statistics

| Category | Count |
|----------|-------|
| Pages | 63+ |
| Components | 300+ |
| Services | 45+ |
| Hooks | 23 |
| Edge Functions | 49 |
| Database Migrations | 148 |
| UI Components | 56 |

**Total Lines of Code:** ~50,000+ (estimated)

---

## Support & Documentation

**Additional Documentation Files:**
- `COMPREHENSIVE_DOCS.md` - Detailed feature documentation
- `DATABASE_MIGRATION_GUIDE.md` - Migration instructions
- `COMPLETE_MIGRATION_SOLUTION.md` - Complex migration scenarios

**Version Control:** Git (GitHub/GitLab)

**Issue Tracking:** Linear/GitHub Issues

**CI/CD:** Configured for automated deployments

---

## Contact & Maintenance

This documentation covers the PayRun Pro application as of March 26, 2026. For updates, refer to the latest git commits and the project's documentation folder.

**Last Updated:** 2026-03-26

---

**End of Documentation**
