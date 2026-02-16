# PayRun Pro: Comprehensive Technical Documentation

This document provides a detailed overview of the PayRun Pro application, its architecture, tech stack, and core business modules. It is designed to be "AI-ready," providing sufficient context for an AI agent to understand and develop the system.

## 1. Project Overview
**PayRun Pro** is a comprehensive payroll management system designed for multi-tenant organizations. It handles employee management, payroll calculations, payrun approvals, and reporting across various paygroup types (Regular, Expatriate, Contractor, Intern).

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 (Vite-powered)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: Radix UI (Headless primitives), Lucide React (Icons), Framer Motion (Animations)
- **State Management**: TanStack Query (v5) for server state, React Hook Form (v7) for forms
- **Utilities**: `clsx`, `tailwind-merge`, `date-fns`, `zod` (Validation)
- **Reporting**: `jspdf`, `xlsx`, `jszip`

### Backend (Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth with custom user profiles and invitations.
- **Serverless Logic**: Supabase Edge Functions (Deno)
- **Storage**: Supabase Storage for payslips and reports
- **Security**: Row Level Security (RLS) enforced via Organization-Based Access Control (OBAC)

### Infrastructure
- **Hosting**: Vercel (Frontend), Supabase (Backend)
- **CI/CD**: GitHub Actions (Staging/Production branches)

---

## 3. Architecture & Project Layout

### Root Structure
- `/src`: Frontend application source
- `/supabase`: Backend configuration (Migrations, Functions, Config)
- `/docs`: Detailed architectural notes and developer guides
- `/scripts`: Utility scripts for environment management and data syncing

### Source Directory (`/src`)
- `components/`: UI components organized by feature (payroll, projects, common)
- `hooks/`: Custom React hooks for shared logic
- `lib/`:
  - `services/`: Service layer handling all API/Supabase calls
  - `types/`: Comprehensive TypeScript interfaces and enums
  - `utils/`: Helper functions (formatting, calculations)
- `pages/`: Page-level components and routing

### Backend Structure (`/supabase`)
- `migrations/`: SQL migration files for version-controlled schema changes
- `functions/`: Edge functions for critical logic:
  - `calculate-pay`: Core payroll calculation engine
  - `secure-login`: Enhanced authentication logic
  - `process-email-queue`: Async email notifications (Resend)
  - `manage-payruns`: Payrun lifecycle management

---

## 4. Environment Management
The project uses environment-specific files:
- `.env.staging`: Connected to staging Supabase (`sbphmrjo...`)
- `.env.production`: Connected to production Supabase (`kctwfg...`)
- `env-manager.js`: Selects the correct environment during development

**Key Commands**:
- `npm run dev`: Start development server
- `npm run db:staging` / `npm run db:prod`: Push database schema
- `npm run deploy:staging` / `npm run deploy:prod`: Deploy source code

---

## 5. Core Business Modules

### PayGroups Module
Supports multiple payroll types:
- **Regular**: Standard local payroll
- **Expatriate**: Multi-currency support (USD/local), custom exchange rates, specific tax countries
- **Contractor/Intern**: Simplified payment structures
- **Architecture**: Scalable type system in `src/lib/types/paygroups.ts` and centralized service in `src/lib/services/paygroups.service.ts`.

### Payroll Engine
Handles the lifecycle of a "Pay Run":
1. **Creation**: Employees are assigned to a payrun based on their paygroup.
2. **Calculation**: Edge functions calculate tax, allowances, and net pay.
3. **Approval**: Multi-step approval workflow (Submit -> Approve -> Complete).
4. **Reporting**: PDF/Excel generation for bank schedules and payslips.

### Security & OBAC
- **Multi-tenancy**: Every entity belongs to an `organization_id`.
- **OBAC (Organization-Based Access Control)**: Custom RBAC system where roles are defined per organization.
- **Audit Logging**: Automatic tracking of sensitive operations (User management, Payroll changes).

---

## 6. Database Schema Summary
Key tables include:
- `organizations`: Tenant metadata
- `user_roles`: Mapping of users to roles within an organization
- `profiles`: Extended user metadata
- `employees`: Core workforce data
- `pay_groups` / `expatriate_pay_groups`: Configuration for payroll calculation
- `pay_runs`: Master record for a specific payroll period
- `payrun_employees`: Individual line items for a calculate payroll

---

## 7. Development Guidelines
1. **Always use Service Layer**: Don't call Supabase directly from components; use `src/lib/services`.
2. **Strict Types**: Define Zod schemas and TypeScript interfaces for all data.
3. **Multi-tenancy first**: Always ensure `organization_id` is passed and handled in queries.
4. **RLS Verification**: Test sensitivity data isolation after every schema change.
