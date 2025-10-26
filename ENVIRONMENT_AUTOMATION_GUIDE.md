# Environment Automation System

This document describes the automated environment switching system for the Payroll project.

## 🎯 Overview

The system automatically switches between staging and production environments based on the current Git branch:

| Git Branch | Environment | Supabase Project | Purpose |
|------------|-------------|------------------|---------|
| `staging` | Staging | sbphmrjoappwlervnbtm.supabase.co | Development & Testing |
| `main` | Production | ftiqmqrzebibcixpnll.supabase.co | Live Production |

## 📁 Environment Files

### `.env.local` (Staging)
```bash
# Staging Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=https://sbphmrjoappwlervnbtm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<STAGING_SERVICE_KEY>
NEXT_PUBLIC_ENVIRONMENT=staging
VITE_SUPABASE_URL=https://sbphmrjoappwlervnbtm.supabase.co
VITE_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
VITE_ENVIRONMENT=staging
```

### `.env.production` (Production)
```bash
# Production Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kctwfgbjmhnfqtxhagib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PRODUCTION_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<PRODUCTION_SERVICE_KEY>
NEXT_PUBLIC_ENVIRONMENT=production
VITE_SUPABASE_URL=https://kctwfgbjmhnfqtxhagib.supabase.co
VITE_SUPABASE_ANON_KEY=<PRODUCTION_ANON_KEY>
VITE_ENVIRONMENT=production
```

## 🔧 Automation Components

### 1. Environment Manager (`env-manager.js`)
- Automatically detects current Git branch
- Copies appropriate environment file to `.env.next`
- Provides detailed logging of environment configuration

### 2. Git Hook (`.git/hooks/post-checkout`)
- Runs automatically when switching branches
- Executes `env-manager.js` to switch environments
- No manual intervention required

### 3. Package.json Scripts
```json
{
  "dev": "node env-manager.js && vite",
  "dev:staging": "cp .env.local .env.next && vite",
  "dev:production": "cp .env.production .env.next && vite",
  "build": "node env-manager.js && vite build",
  "build:staging": "cp .env.local .env.next && vite build",
  "build:production": "cp .env.production .env.next && vite build",
  "env:switch": "node env-manager.js",
  "env:staging": "cp .env.local .env.next && echo '✅ Switched to staging environment'",
  "env:production": "cp .env.production .env.next && echo '✅ Switched to production environment'"
}
```

## 🚀 Usage

### Automatic Environment Switching
```bash
# Switch to staging branch (automatically loads staging environment)
git checkout staging
npm run dev

# Switch to main branch (automatically loads production environment)
git checkout main
npm run dev
```

### Manual Environment Switching
```bash
# Force switch to staging environment
npm run env:staging

# Force switch to production environment
npm run env:production

# Auto-detect and switch based on current branch
npm run env:switch
```

### Development Commands
```bash
# Start development server (auto-detects environment)
npm run dev

# Start with specific environment
npm run dev:staging
npm run dev:production

# Build for specific environment
npm run build:staging
npm run build:production
```

## 🔍 Environment Verification

The system includes automatic verification logging in `App.tsx`:

```typescript
console.log('🌿 Environment:', import.meta.env.VITE_ENVIRONMENT);
console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🔧 Vite Mode:', import.meta.env.MODE);
```

When you switch branches, you should see:
- **Staging branch**: `🌿 Environment: staging` and staging Supabase URL
- **Main branch**: `🌿 Environment: production` and production Supabase URL

## 🗄️ Database Synchronization

### Sync Production to Staging
```bash
# Export from production
supabase db dump \
  --db-url "postgresql://postgres:<prod_password>@db.ftiqmqrzebibcixpnll.supabase.co:5432/postgres" \
  -f production_dump.sql

# Restore to staging
supabase db restore \
  --db-url "postgresql://postgres:<staging_password>@db.sbphmrjoappwlervnbtm.supabase.co:5432/postgres" \
  -f production_dump.sql
```

### Schema-only sync
```bash
# Export schema only
supabase db dump --schema-only \
  --db-url "postgresql://postgres:<prod_password>@db.ftiqmqrzebibcixpnll.supabase.co:5432/postgres" \
  -f schema.sql

# Apply schema to staging
supabase db push \
  --db-url "postgresql://postgres:<staging_password>@db.sbphmrjoappwlervnbtm.supabase.co:5432/postgres" \
  -f schema.sql
```

## 🛠️ Troubleshooting

### Environment Files Not Found
If you see "Environment file not found" error:
1. Ensure `.env.local` and `.env.production` exist in project root
2. Check file permissions
3. Verify Git branch is correctly detected

### Git Hook Not Working
If automatic switching doesn't work:
1. Check hook permissions: `chmod +x .git/hooks/post-checkout`
2. Verify hook content: `cat .git/hooks/post-checkout`
3. Test manually: `node env-manager.js`

### Environment Variables Not Loading
If environment variables aren't loading:
1. Check `.env.next` file exists and has correct content
2. Verify Vite configuration in `vite.config.ts`
3. Restart development server after environment changes

## 📋 Setup Checklist

- [x] Created `.env.local` (staging configuration)
- [x] Created `.env.production` (production configuration)
- [x] Updated `.gitignore` to exclude environment files
- [x] Created `env-manager.js` script
- [x] Set up Git post-checkout hook
- [x] Updated `package.json` scripts
- [x] Added environment verification logging to `App.tsx`
- [x] Tested automatic environment switching

## 🎉 Benefits

✅ **Automatic Environment Switching**: No manual environment file management  
✅ **Branch-based Configuration**: Environment automatically matches Git branch  
✅ **Development Safety**: Staging environment prevents accidental production changes  
✅ **Deployment Ready**: Production builds use correct environment  
✅ **Team Consistency**: All developers use same environment setup  
✅ **Error Prevention**: Reduces human error in environment configuration  

## 🔄 Workflow

1. **Development**: Work on `staging` branch with staging environment
2. **Testing**: Test features in staging environment
3. **Deployment**: Merge to `main` branch for production deployment
4. **Database Sync**: Sync production data to staging when needed

This system ensures that your development environment always matches your Git branch, providing a seamless and error-free development experience.
