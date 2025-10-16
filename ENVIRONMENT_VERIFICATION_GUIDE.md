# 🧠 Q-Payroll Environment Verification Guide

This guide covers the comprehensive environment verification system that validates all connections across Supabase, GitHub, and Lovable AI.

## 🚀 Quick Start

### Run the Verification Script

```bash
# Using npm script (recommended)
npm run verify:env

# Or run directly
node scripts/verifyEnvironmentLinks.cjs

# Or run the TypeScript version (if you have ts-node)
npx ts-node scripts/verifyEnvironmentLinks.ts
```

## 📊 What the Script Checks

### ✅ Environment Detection
- **Current Git Branch**: `main` or `staging`
- **GitHub Repository**: Remote origin URL
- **Supabase Project**: Project reference from environment variables
- **Lovable App**: App name from environment or inference

### 🔍 Validation Logic

| Branch | Expected GitHub Repo | Expected Supabase Ref | Expected Lovable App |
|--------|---------------------|----------------------|---------------------|
| `main` | `Q-Sourcing/payrun-pro` | `kctwfgbjmhnfqtxhagib` | `Payroll` |
| `staging` | `Q-Sourcing/payrunpro-staging` | `sbphmrjoappwlervnbtm` | `Payroll-Staging` |

## 📋 Sample Output

### ✅ All Correct (Staging)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   Q-PAYROLL ENVIRONMENT VERIFICATION  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Branch: staging
GitHub Repository: Q-Sourcing/payrunpro-staging ✅
Supabase Project: sbphmrjoappwlervnbtm ✅
Lovable App: Payroll-Staging ✅
Environment Variables: Present ✅

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              SUMMARY                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔒 Environment: STAGING
✅ All environment links verified successfully.

───────────────
Q-PAYROLL ENVIRONMENT AUDIT COMPLETE
Safe: TRUE
```

### ⚠️ Mismatch Detected
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   Q-PAYROLL ENVIRONMENT VERIFICATION  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Branch: staging
GitHub Repository: https://github.com/Q-Sourcing/payrun-pro.git ❌
Supabase Project: kctwfgbjmhnfqtxhagib ❌
Lovable App: Payroll-Staging ✅
Environment Variables: Present ✅

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              SUMMARY                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ ENVIRONMENT MISMATCH DETECTED
Branch: staging
GitHub Repository: https://github.com/Q-Sourcing/payrun-pro.git ❌ (Expected: Q-Sourcing/payrunpro-staging)
Supabase Project: kctwfgbjmhnfqtxhagib ❌ (Expected: sbphmrjoappwlervnbtm)

💡 Action Required:
• Switch to staging Supabase in Lovable → Integrations → Supabase
• Ensure you're connected to project: sbphmrjoappwlervnbtm
• Verify GitHub remote points to: Q-Sourcing/payrunpro-staging

───────────────
Q-PAYROLL ENVIRONMENT AUDIT COMPLETE
Safe: FALSE
```

## 🛠️ Troubleshooting

### If GitHub Repository Mismatch
```bash
# Check current remote
git remote -v

# Update remote to staging repository
git remote set-url origin https://github.com/Q-Sourcing/payrunpro-staging.git

# Or update to production repository
git remote set-url origin https://github.com/Q-Sourcing/payrun-pro.git
```

### If Supabase Project Mismatch

#### For Staging Environment:
1. Go to Lovable Dashboard
2. Navigate to **Integrations → Supabase**
3. Disconnect current Supabase project
4. Connect to staging project: `sbphmrjoappwlervnbtm`
5. Verify environment variables are updated

#### For Production Environment:
1. Go to Lovable Dashboard
2. Navigate to **Integrations → Supabase**
3. Disconnect current Supabase project
4. Connect to production project: `kctwfgbjmhnfqtxhagib`
5. Verify environment variables are updated

### If Environment Variables Missing
Check your `.env` files:
```bash
# Check staging environment
cat .env.staging

# Check production environment
cat .env.production
```

Ensure they contain:
```bash
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🔧 GitHub Actions Integration

The script automatically detects when running in GitHub Actions and shows additional information:

```
📋 GitHub Action Detected:
Repository: Q-Sourcing/payrun-pro
Branch: staging
Lovable App: Payroll-Staging
```

### Environment Variables for GitHub Actions
Set these secrets in your GitHub repository:

- `STAGING_SUPABASE_URL`: `https://sbphmrjoappwlervnbtm.supabase.co`
- `STAGING_SUPABASE_ANON_KEY`: Your staging anon key
- `PRODUCTION_SUPABASE_URL`: `https://kctwfgbjmhnfqtxhagib.supabase.co`
- `PRODUCTION_SUPABASE_ANON_KEY`: Your production anon key
- `LOVABLE_APP_NAME`: App name (Payroll or Payroll-Staging)

## 📁 Files Created

- `scripts/verifyEnvironmentLinks.ts` - TypeScript version
- `scripts/verifyEnvironmentLinks.cjs` - JavaScript version (executable)
- `ENVIRONMENT_VERIFICATION_GUIDE.md` - This guide

## 🎯 Usage in CI/CD

### GitHub Actions Workflow
Add this step to your GitHub Actions workflow:

```yaml
- name: Verify Environment Links
  run: npm run verify:env
  env:
    GITHUB_REPOSITORY: ${{ github.repository }}
    GITHUB_REF_NAME: ${{ github.ref_name }}
    LOVABLE_APP_NAME: ${{ secrets.LOVABLE_APP_NAME }}
```

### Pre-deployment Check
Run before any deployment:

```bash
# Check if environment is correctly configured
npm run verify:env

# Only proceed if exit code is 0 (success)
if [ $? -eq 0 ]; then
  echo "Environment verified, proceeding with deployment"
  npm run deploy:staging
else
  echo "Environment mismatch detected, aborting deployment"
  exit 1
fi
```

## 🔒 Security Features

- ✅ **No sensitive data exposure** - Only shows project references, not full keys
- ✅ **Safe for CI/CD** - Can run in GitHub Actions without exposing secrets
- ✅ **Local and remote** - Works both locally and in cloud environments
- ✅ **Exit codes** - Returns proper exit codes for automation

## 🎉 Benefits

1. **Instant Verification** - One command confirms entire environment setup
2. **Prevents Data Leaks** - Catches staging → production mismatches early
3. **CI/CD Integration** - Automated checks in deployment pipelines
4. **Clear Actions** - Tells you exactly what to fix when issues are found
5. **Multi-Environment** - Supports both staging and production workflows

---

**🚀 Ready to verify your environment? Run `npm run verify:env` now!**
