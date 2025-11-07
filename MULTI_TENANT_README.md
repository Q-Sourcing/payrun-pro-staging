# 🔥 Multi-Tenant Payroll System + Super Admin Dashboard

## 🎯 Overview

This is a comprehensive multi-tenant SaaS payroll system with a Super Admin Dashboard that allows secure management of multiple organizations, companies, and users. The system maintains strict tenant isolation through Row Level Security (RLS) while providing powerful administrative capabilities.

## ✨ Key Features

### 🏢 Multi-Tenant Architecture
- **Organizations** → **Companies** → **Org Units** (Head Office | Project)
- Strict tenant isolation with RLS policies
- No cross-tenant data access
- Scalable to unlimited organizations

### 👑 Super Admin Dashboard
- Complete system overview and analytics
- Organization management (create, edit, activate/deactivate)
- Company and org unit management
- User management across all tenants
- Global reports and activity monitoring

### 🔐 Secure Impersonation
- Super Admin can impersonate any organization
- Short-lived impersonation tokens (configurable TTL)
- Complete audit trail of impersonation sessions
- Secure JWT-based authentication

### 💰 Unified Payroll System
- **Master Payrolls** table for all payroll types
- **Pay Run Items** with dual-currency support
- Expatriate payroll with per-row exchange rates
- Support for all employee types (Regular, Intern, Temporary, Trainee, Expatriate)

### 🌍 Global Catalogs
- Continents, Countries, Currencies
- Employee Types (Global, immutable by normal users)
- System-wide configuration management

## 🗄️ Database Schema

### Core Tables

#### Global Catalogs
```sql
continents (id, name)
countries (id, name, iso2, continent_id)
currencies (code, name, symbol)
employee_types (id, code, name, pay_basis, active)
```

#### Tenant Structure
```sql
organizations (id, name, description, active)
companies (id, organization_id, name, country_id, currency)
org_units (id, company_id, name, kind) -- 'head_office' | 'project'
```

#### People & Payroll
```sql
employee_master (id, organization_id, company_id, org_unit_id, employee_type_id, ...)
employee_pay_groups (id, organization_id, employee_id, pay_group_id, assigned_on, unassigned_on)
pay_groups (id, organization_id, org_unit_id, employee_type_id, name, currency, pay_frequency)
master_payrolls (id, organization_id, company_id, org_unit_id, employee_type_id, pay_group_id, ...)
pay_run_items (id, master_payroll_id, employee_id, ...) -- with expatriate fields
```

#### Authentication & Logging
```sql
user_profiles (id, organization_id, role) -- 'super_admin' | 'org_admin' | 'user'
activity_logs (id, organization_id, user_id, action, resource_type, ...)
impersonation_logs (id, super_admin_id, target_user_id, target_organization_id, ...)
```

## 🚀 Quick Start

### 1. Deploy the System
```bash
# Run the deployment script
./scripts/deploy-multi-tenant.sh
```

### 2. Access Super Admin Dashboard
1. Navigate to `/admin` in your browser
2. Login with your super admin credentials
3. You'll see the GWAZU organization already seeded

### 3. Test Impersonation
1. Go to Organizations list
2. Click "Impersonate" on any organization
3. You'll be switched to that organization's context
4. Use "End Impersonation" to return to Super Admin

## 🎛️ Super Admin Dashboard

### Routes
- `/admin` - Overview dashboard
- `/admin/organizations` - Manage all organizations
- `/admin/organizations/:orgId` - Organization details
- `/admin/system-settings` - Global catalogs and settings
- `/admin/global-reports` - System-wide analytics
- `/admin/activity-log` - All system activity
- `/admin/impersonation-log` - Impersonation audit trail

### Key Capabilities
- **Organization Management**: Create, edit, activate/deactivate organizations
- **User Management**: View and manage users across all tenants
- **Impersonation**: Securely impersonate any organization
- **Global Reports**: System-wide payroll and user analytics
- **Activity Monitoring**: Complete audit trail of all actions

## 🔒 Security Features

### Row Level Security (RLS)
- Every tenant-scoped table has RLS policies
- Users can only access their organization's data
- Super Admin can access all data
- No cross-tenant data leakage possible

### Impersonation Security
- Only Super Admin can initiate impersonation
- Short-lived tokens (default 15 minutes)
- Complete audit trail
- IP address and user agent logging

### JWT Claims
- `organization_id`: Current user's organization
- `role`: User role (super_admin, org_admin, user)
- `impersonated_by`: Who initiated impersonation (if applicable)
- `impersonated_role`: Role being impersonated

## 🏗️ Architecture

### Client Services
```
src/lib/services/admin/
├── organizations.ts      # Organization management
├── companies.ts          # Company management
├── org-units.ts          # Org unit management
├── catalogs.ts           # Global catalogs
└── impersonation.ts      # Impersonation functionality
```

### Multi-Tenant Services
```
src/lib/services/multi-tenant-payroll.ts  # Unified payroll operations
```

### Admin Components
```
src/components/admin/
├── AdminLayout.tsx           # Main admin layout
├── OverviewPage.tsx          # Dashboard overview
└── OrganizationsList.tsx     # Organizations management
```

## 🌱 Seeded Data

### GWAZU Organization
- **Name**: GWAZU
- **Description**: Seeded sample tenant for development and testing
- **Companies**: GWAZU Limited (Uganda, UGX)
- **Org Units**: Head Office, Project Alpha
- **Pay Groups**: One for each employee type in each org unit
- **Sample Employees**: 7 employees across different types

### Global Catalogs
- **Continents**: Africa, North America, Europe, Asia, South America, Oceania
- **Countries**: Uganda, Kenya, Tanzania, Rwanda, South Sudan, US, UK
- **Currencies**: UGX, USD, KES, TZS, RWF, SSP, GBP, EUR
- **Employee Types**: REGULAR, INTERN, TEMPORARY, TRAINEE, EXPATRIATE

## 🔧 Configuration

### Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENVIRONMENT=staging
```

### Impersonation Settings
- Default TTL: 900 seconds (15 minutes)
- Maximum TTL: 3600 seconds (1 hour)
- Audit retention: Indefinite

## 📊 Usage Examples

### Create New Organization
```typescript
import { OrganizationService } from '@/lib/services/admin/organizations'

const newOrg = await OrganizationService.createOrganization({
  name: 'Acme Corp',
  description: 'A new organization',
  active: true
})
```

### Impersonate Organization
```typescript
import { ImpersonationService } from '@/lib/services/admin/impersonation'

const result = await ImpersonationService.impersonate({
  target_org_id: 'org-uuid',
  target_role: 'org_admin',
  ttl_seconds: 1800 // 30 minutes
})
```

### Create Pay Run
```typescript
import { MultiTenantPayrollService } from '@/lib/services/multi-tenant-payroll'

const payRun = await MultiTenantPayrollService.createPayRun({
  organization_id: 'org-uuid',
  pay_period_start: '2024-01-01',
  pay_period_end: '2024-01-31',
  base_currency: 'UGX'
})
```

## 🧪 Testing

### Test Impersonation
1. Login as Super Admin
2. Go to Organizations list
3. Click "Impersonate" on GWAZU
4. Verify you can only see GWAZU data
5. Click "End Impersonation" to return

### Test Tenant Isolation
1. Create two organizations
2. Add data to each
3. Verify no cross-tenant data access
4. Test with different user roles

## 🚨 Important Notes

### Staging Environment
- This is the **STAGING** environment
- Connected to staging Supabase database
- Safe for development and testing
- All data is non-production

### Data Safety
- All migrations are idempotent
- No data loss during deployment
- RLS policies prevent data leakage
- Complete audit trail maintained

### Performance
- Indexes on all foreign keys
- Optimized queries with proper joins
- Real-time subscriptions for live updates
- Efficient RLS policy evaluation

## 🔄 Migration Path

### From Single-Tenant to Multi-Tenant
1. Existing data is preserved
2. New multi-tenant tables are created
3. Existing tables get `organization_id` columns
4. RLS policies are applied
5. No data migration required (staging environment)

### Future Enhancements
- [ ] Advanced reporting and analytics
- [ ] Custom organization branding
- [ ] API rate limiting per organization
- [ ] Advanced user permissions
- [ ] Multi-currency support
- [ ] Automated payroll processing

## 📞 Support

For questions or issues:
1. Check the activity logs in Super Admin Dashboard
2. Review the impersonation logs for security issues
3. Check browser console for client-side errors
4. Verify RLS policies are working correctly

---

**Built with ❤️ by Nalungu Kevin Colin**

*This system provides enterprise-grade multi-tenancy with complete data isolation and powerful administrative capabilities.*
