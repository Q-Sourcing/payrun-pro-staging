# 🎨 Environment Banner System

## 🎯 Overview

The Environment Banner is a visual indicator that shows which environment your Payroll app is currently running in. It appears as a fixed badge in the top-right corner of the application.

## 🎨 Banner Types

### 🟡 Staging Environment
- **Badge**: 🧪 STAGING
- **Color**: Yellow background (#FCD34D)
- **Triggered by**: `VITE_ENVIRONMENT=staging`
- **Purpose**: Development and testing environment

### 🟢 Production Environment
- **Badge**: 🟢 PRODUCTION
- **Color**: Green background (#10B981)
- **Triggered by**: `VITE_ENVIRONMENT=production`
- **Purpose**: Live production system

### 🔧 Development Mode
- **Badge**: 🔧 DEVELOPMENT
- **Color**: Blue background (#3B82F6)
- **Triggered by**: Vite `MODE=development`
- **Purpose**: Local development mode

## 🚀 How It Works

### Automatic Detection
The banner automatically detects the environment using:
1. `VITE_ENVIRONMENT` variable (primary)
2. `NEXT_PUBLIC_ENVIRONMENT` variable (fallback)
3. Vite `MODE` variable (development detection)

### Environment Switching
The banner changes automatically when you:
- Switch Git branches (`git checkout staging/main`)
- Use manual environment commands (`npm run env:staging/production`)
- Change environment variables

## 🧪 Testing the Banner

### Test Staging Banner
```bash
npm run env:staging
npm run dev
# Visit http://localhost:8080
# Look for yellow "🧪 STAGING" badge
```

### Test Production Banner
```bash
npm run env:production
npm run dev
# Visit http://localhost:8080
# Look for green "🟢 PRODUCTION" badge
```

### Test Branch Switching
```bash
# Switch to staging branch
git checkout staging
npm run dev
# → Shows staging banner

# Switch to main branch
git checkout main
npm run dev
# → Shows production banner
```

## 🎯 Banner Behavior

| Environment | Badge | Color | Visibility |
|-------------|-------|-------|------------|
| **Staging** | 🧪 STAGING | Yellow | Always visible |
| **Production** | 🟢 PRODUCTION | Green | Always visible |
| **Development** | 🔧 DEVELOPMENT | Blue | When MODE=development |
| **Unknown** | ❓ UNKNOWN | Gray | Fallback |

## 🔧 Implementation Details

### Component Location
- **File**: `src/components/EnvBanner.tsx`
- **Import**: Added to `src/App.tsx`
- **Position**: Fixed top-right corner (z-index: 9999)

### Styling
- **Position**: `position: fixed, top: 1rem, right: 1rem`
- **Z-index**: `9999` (above all other content)
- **Responsive**: Works on all screen sizes
- **Accessible**: High contrast colors and clear text

### Environment Variables
```bash
# Staging
VITE_ENVIRONMENT=staging
VITE_SUPABASE_URL=https://sbphmrjoappwlervnbtm.supabase.co

# Production
VITE_ENVIRONMENT=production
VITE_SUPABASE_URL=https://ftiqmqrjzebibcixpnll.supabase.co
```

## 🎨 Customization

### Modify Colors
Edit `src/components/EnvBanner.tsx`:
```tsx
// Staging - Yellow
backgroundColor: "#FCD34D",
color: "#1F2937",

// Production - Green
backgroundColor: "#10B981",
color: "white",

// Development - Blue
backgroundColor: "#3B82F6",
color: "white",
```

### Modify Position
```tsx
style={{
  position: "fixed",
  top: "1rem",        // Distance from top
  right: "1rem",      // Distance from right
  // ... other styles
}}
```

### Hide Production Banner
To hide the production banner (only show staging):
```tsx
if (env === "production") return null; // Hide production banner
```

## 🚀 Deployment

### Lovable Integration
The banner will automatically work in Lovable deployments:
- **Staging branch** → Shows staging banner
- **Main branch** → Shows production banner
- **Environment variables** are automatically set per branch

### Manual Deployment
```bash
# Deploy staging
git checkout staging
npm run build
# → Build includes staging banner

# Deploy production
git checkout main
npm run build
# → Build includes production banner
```

## 🔍 Troubleshooting

### Banner Not Showing
1. Check environment variables:
   ```bash
   cat .env.next | grep VITE_ENVIRONMENT
   ```

2. Verify component is imported:
   ```tsx
   import EnvBanner from "@/components/EnvBanner";
   ```

3. Check browser console for errors

### Wrong Banner Showing
1. Verify environment configuration:
   ```bash
   npm run env:staging  # or env:production
   ```

2. Check current branch:
   ```bash
   git branch --show-current
   ```

3. Restart development server:
   ```bash
   npm run dev
   ```

## ✅ Benefits

- **Visual Clarity**: Always know which environment you're in
- **Error Prevention**: Prevents accidental production changes
- **Team Communication**: Clear environment indication for all team members
- **Automatic**: No manual configuration needed
- **Responsive**: Works on all devices and screen sizes

## 🎉 Result

Your Payroll app now has a professional environment indicator that:
- ✅ Shows staging banner when in staging environment
- ✅ Shows production banner when in production environment
- ✅ Automatically switches based on Git branch
- ✅ Provides clear visual feedback
- ✅ Prevents environment confusion

**No more confusion about which environment you're working in!** 🚀
