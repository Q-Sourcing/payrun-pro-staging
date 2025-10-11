# 🚀 Complete Edge Function Deployment Guide

## Prerequisites ✅
- ✅ Homebrew installed
- ✅ Supabase CLI installed (`brew install supabase/tap/supabase`)
- ✅ Your Supabase project configured

## 🎯 Quick Deployment (Recommended)

Run the automated deployment script:

```bash
./scripts/deploy-locally.sh
```

This script will:
1. Login to Supabase
2. Link your project
3. Deploy database migrations
4. Deploy Edge Functions
5. Test the deployment

## 📋 Manual Deployment Steps

If you prefer to run commands manually:

### 1. Login to Supabase
```bash
supabase login
```
*This will open a browser window for authentication*

### 2. Link Your Project
```bash
supabase link --project-ref kctwfgbjmhnfqtxhagib
```

### 3. Deploy Database Migration
```bash
supabase db push
```
*This creates the `pay_calculation_audit_log` table*

### 4. Deploy Edge Function
```bash
supabase functions deploy calculate-pay
```
*This deploys the payroll calculation Edge Function*

### 5. Test the Deployment
```bash
node scripts/test-edge-function.js
```

## 🔍 Verification Steps

### 1. Check Supabase Dashboard
- Go to **Edge Functions** → Verify `calculate-pay` is deployed
- Go to **Database** → Tables → Verify `pay_calculation_audit_log` exists

### 2. Test in Application
1. **Create a new pay run**
2. **Edit employee calculations** in PayRunDetailsDialog
3. **Check browser console** for any errors
4. **Verify calculations** match expected results

### 3. Check Audit Logs
```sql
-- Run this in Supabase SQL Editor
SELECT * FROM pay_calculation_audit_log 
ORDER BY calculated_at DESC 
LIMIT 10;
```

## 🛠️ Troubleshooting

### Issue: "Access token not provided"
**Solution**: Run `supabase login` and authenticate in browser

### Issue: "Cannot find project ref"
**Solution**: Run `supabase link --project-ref kctwfgbjmhnfqtxhagib`

### Issue: Edge Function deployment fails
**Solution**: Check that `supabase/functions/calculate-pay/index.ts` exists

### Issue: Database migration fails
**Solution**: Check your database permissions and RLS policies

## 📊 What Gets Deployed

### Database Changes
- ✅ `pay_calculation_audit_log` table created
- ✅ RLS policies configured
- ✅ Audit trail for all calculations

### Edge Function
- ✅ `calculate-pay` function deployed
- ✅ Complete payroll calculation logic
- ✅ CORS headers configured
- ✅ Input validation included

### Client Integration
- ✅ PayRunDetailsDialog uses server calculations
- ✅ CreatePayRunDialog uses server calculations
- ✅ Fallback to client-side if server fails

## 🎉 Success Indicators

You'll know the deployment is successful when:

1. **✅ No errors** in browser console
2. **✅ Calculations work** in PayRunDetailsDialog
3. **✅ New pay runs** create with server calculations
4. **✅ Audit logs** appear in database
5. **✅ Fallback works** if Edge Function is down

## 🔄 Rollback Plan

If you need to rollback to client-side calculations:

1. **Temporarily disable** Edge Function calls in:
   - `PayRunDetailsDialog.tsx` (line 307)
   - `CreatePayRunDialog.tsx` (line 183)

2. **Revert to fallback** calculations by uncommenting the fallback code

3. **System will work** with client-side calculations as before

---

**🎯 Ready to deploy? Run `./scripts/deploy-locally.sh` and follow the prompts!**
