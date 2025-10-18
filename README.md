# 🧪 Q-Payroll Staging Environment

**This is the STAGING environment for Q-Payroll development and testing.**

## 🎯 Environment Details

- **Environment**: Staging
- **Database**: Staging Supabase (`sbphmrjoappwlervnbtm.supabase.co`)
- **Purpose**: Development and testing
- **Status**: Active development environment

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access the app
open http://localhost:8081
```

## 🔧 Environment Commands

```bash
# Database operations
npm run db:staging          # Link to staging database
npm run deploy:staging      # Deploy to staging

# Data sync
npm run clone:staging       # Sync production data to staging

# Verification
npm run verify:env          # Verify environment configuration
```

## 📊 Database Status

- **Connected to**: Staging Supabase
- **Data Source**: Synced from production
- **Status**: Ready for development

## ⚠️ Important Notes

- This is the **STAGING** environment
- Safe for development and testing
- Not connected to production data
- Environment indicators show "STAGING"

## 🔗 Related Repositories

- **Production**: `payrun-pro` (main branch)
- **Staging**: `payrun-pro-staging` (this repository)
