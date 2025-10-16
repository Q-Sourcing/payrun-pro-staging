# 🧠 Supabase Environment Diagnostic Guide

This guide provides multiple ways to check your Supabase connection and verify you're connected to the correct environment (staging vs production).

## 🚀 Quick Start

### Method 1: Browser Console (Recommended)
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste the entire contents of `src/utils/consoleDiagnostic.js`
4. Press Enter to run the diagnostic

### Method 2: React Component
1. Import and use the `SupabaseDiagnostic` component in your app
2. Navigate to `/diagnostics` page (if you add the route)
3. The diagnostic runs automatically in development mode

### Method 3: TypeScript Utility
```typescript
import { checkSupabaseEnvironment } from './src/utils/checkSupabaseEnv';
await checkSupabaseEnvironment();
```

## 📊 Expected Output Examples

### ✅ Staging Connection (Correct)
```
🔍 Checking Supabase connection…
✅ Connected to Supabase (STAGING)
Project ref: sbphmrjoappwlervnbtm
Query test succeeded. Environment is safe to use.
🎉 You are correctly connected to the staging environment!
```

### ⚠️ Production Connection (Warning)
```
🔍 Checking Supabase connection…
⚠️ Warning: Connected to PRODUCTION
Project ref: kctwfgbjmhnfqtxhagib
You are using the live payroll database.
💡 To switch to staging:
  • Reconnect Lovable → Integrations → Supabase → Payroll-Staging
  • Or update environment variables to point to staging
```

### ❌ Connection Error
```
🔍 Checking Supabase connection…
❌ Connection failed: Missing environment variables
Missing: { url: 'NEXT_PUBLIC_SUPABASE_URL', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' }
💡 Suggestions:
  • Check your Lovable → Integrations → Supabase link
  • Ensure .env.staging is loaded or Supabase is correctly connected
```

## 🔧 How It Works

### Environment Detection Logic
The diagnostic uses these known project references:
- **Staging**: `sbphmrjoappwlervnbtm`
- **Production**: `kctwfgbjmhnfqtxhagib`

### Project Reference Extraction
The script extracts the project reference from the Supabase URL:
```
Format: https://[project-ref].supabase.co
Example: https://sbphmrjoappwlervnbtm.supabase.co → sbphmrjoappwlervnbtm
```

### Connection Test
The diagnostic performs a simple test query:
```sql
SELECT id FROM employees LIMIT 1;
```

## 🛠️ Troubleshooting

### If you see "Missing environment variables":
1. Check your Lovable dashboard → Integrations → Supabase
2. Ensure the Supabase project is properly linked
3. Verify environment variables are set in Lovable
4. Make sure variables are prefixed with `VITE_` (e.g., `VITE_SUPABASE_URL`)

### If you see "Connected to PRODUCTION":
1. **IMMEDIATELY** switch to staging in Lovable
2. Go to Lovable → Integrations → Supabase
3. Select "Payroll-Staging" project
4. Re-run the diagnostic to confirm

### If you see "Connection failed":
1. Check if your Supabase project is active
2. Verify API keys are correct and not expired
3. Ensure the `employees` table exists in your database

## 📁 Files Created

- `src/utils/checkSupabaseEnv.ts` - TypeScript utility function
- `src/components/Diagnostics/SupabaseDiagnostic.tsx` - React component
- `src/pages/Diagnostics.tsx` - Diagnostics page
- `src/utils/consoleDiagnostic.js` - Browser console script

## 🎯 Integration

To add the diagnostics page to your app, add this route to your router:

```typescript
import Diagnostics from './pages/Diagnostics';

// Add to your routes
<Route path="/diagnostics" element={<Diagnostics />} />
```

## 🔒 Security Note

This diagnostic tool is designed for development and staging environments. It will:
- ✅ Show project references (safe)
- ✅ Test database connectivity (safe)
- ⚠️ Log environment variables (be careful in production)

**Never run this diagnostic in a production environment** as it may expose sensitive information in logs.
