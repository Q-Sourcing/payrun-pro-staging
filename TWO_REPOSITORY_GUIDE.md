# 🎉 Two Repository Setup Complete!

## 📊 **Repository Structure**

### **Staging Repository**
- **Local Path**: `/Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/`
- **Remote**: `https://github.com/Q-Sourcing/payrun-pro-staging.git`
- **Branch**: `main` (always staging environment)
- **Supabase**: `sbphmrjoappwlervnbtm` (Payroll-Staging)
- **Environment**: Staging
- **Banner**: 🧪 STAGING

### **Production Repository**
- **Local Path**: `/Users/gervin/Desktop/QSS/Applications/payrun-pro/`
- **Remote**: `https://github.com/Q-Sourcing/payrun-pro.git`
- **Branch**: `main` (always production environment)
- **Supabase**: `kctwfgbjmhnfqtxhagib` (Payroll-Production)
- **Environment**: Production
- **Banner**: 🟢 PRODUCTION

## 🔧 **How to Use**

### **Development Workflow**

#### **1. Work on Staging**
```bash
# Navigate to staging repository
cd /Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging

# Start development server
npm run dev
# → Runs on http://localhost:5173 with staging environment
# → Shows 🧪 STAGING banner
```

#### **2. Sync to Production**
```bash
# From staging repository
./scripts/sync-to-production.sh

# This will:
# - Copy code changes to production repository
# - Optionally sync database schema
# - Commit changes to production repository
```

#### **3. Deploy Production**
```bash
# Navigate to production repository
cd /Users/gervin/Desktop/QSS/Applications/payrun-pro

# Push to production
git push origin main
```

### **Environment Management**

#### **Staging Environment**
- **File**: `.env.staging`
- **Supabase URL**: `https://sbphmrjoappwlervnbtm.supabase.co`
- **Environment**: `staging`
- **Banner**: 🧪 STAGING

#### **Production Environment**
- **File**: `.env.production`
- **Supabase URL**: `https://kctwfgbjmhnfqtxhagib.supabase.co`
- **Environment**: `production`
- **Banner**: 🟢 PRODUCTION

## 🎯 **Benefits of Two Repository Approach**

### **✅ Complete Separation**
- **No confusion**: Each repo is clearly for one environment
- **No accidental pushes**: Can't accidentally push staging code to production
- **Independent development**: Work on staging without affecting production

### **✅ Simpler Mental Model**
- **Staging repo** = Development/testing
- **Production repo** = Live system
- **No branch switching** = No environment confusion

### **✅ Independent Versioning**
- **Different commit histories** for each environment
- **Independent releases** and rollbacks
- **Clear audit trail** per environment

## 🔄 **Sync Process**

### **Code Synchronization**
The sync script (`scripts/sync-to-production.sh`) handles:
- **Source code**: Syncs `src/` directory
- **Configuration**: Updates `package.json`
- **Documentation**: Syncs `docs/` directory
- **Scripts**: Syncs utility scripts

### **Database Synchronization**
- **Schema sync**: Optional database schema updates
- **Manual control**: You choose when to sync database
- **Safe process**: Creates backups before changes

### **What Gets Synced**
✅ **Synced**:
- Application source code (`src/`)
- Package configuration (`package.json`)
- Documentation (`docs/`)
- Utility scripts (`scripts/`)

❌ **Not Synced** (Environment-specific):
- Environment files (`.env.*`)
- Environment managers (`env-manager.js`)
- Database dumps (`*.sql`, `*.dump`)
- Log files (`*.log`)

## 🚀 **Quick Start Commands**

### **Staging Development**
```bash
cd /Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging
npm run dev
```

### **Production Development**
```bash
cd /Users/gervin/Desktop/QSS/Applications/payrun-pro
npm run dev
```

### **Sync Staging → Production**
```bash
cd /Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging
./scripts/sync-to-production.sh
```

### **Deploy Production**
```bash
cd /Users/gervin/Desktop/QSS/Applications/payrun-pro
git push origin main
```

## 📋 **Next Steps**

1. **Test both environments**:
   - Start staging server: `npm run dev` (in staging repo)
   - Start production server: `npm run dev` (in production repo)
   - Verify banners show correctly

2. **Test sync process**:
   - Make changes in staging
   - Run sync script: `./scripts/sync-to-production.sh`
   - Verify changes appear in production

3. **Deploy to production**:
   - Push production changes: `git push origin main`
   - Monitor production deployment

## 🎉 **Setup Complete!**

Your two-repository setup is now complete and ready for use. You have:
- ✅ Complete separation between staging and production
- ✅ Environment-specific configurations
- ✅ Automated sync process
- ✅ Clear development workflow
- ✅ No more branch confusion

**Happy coding!** 🚀
