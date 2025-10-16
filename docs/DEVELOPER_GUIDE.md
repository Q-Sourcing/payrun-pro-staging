# 🧑‍💻 Q-Payroll Developer Guide

## 🌍 Environment Management

This guide covers how to work with staging and production environments in the Q-Payroll project.

### Environment Files

The project uses environment-specific configuration files:

- **`.env.staging`** - Staging environment configuration
- **`.env.production`** - Production environment configuration

### Environment Commands

#### Development Commands

```bash
# Run staging locally
npm run dev -- --env=staging

# Run production locally  
npm run dev -- --env=production
```

#### Database Commands

```bash
# Push schema to staging Supabase
npm run db:staging

# Push schema to production Supabase
npm run db:prod

# Link to staging environment
npm run link:staging

# Link to production environment
npm run link:prod
```

#### Deployment Commands

```bash
# Deploy to Lovable staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

### Environment Detection

The application automatically detects the environment based on `NODE_ENV`:

- **Staging**: `NODE_ENV=staging` → Uses staging Supabase instance
- **Production**: `NODE_ENV=production` → Uses production Supabase instance

### Supabase Configuration

The Supabase client is configured to automatically switch between environments:

```typescript
// Environment-based configuration
const isStaging = process.env.NODE_ENV === 'staging'

const supabaseUrl = isStaging
  ? process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sbphmrjoappwlervnbtm.supabase.co"
  : process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kctwfgbjmhnfqtxhagib.supabase.co"
```

### GitHub Actions

The project includes automated deployment workflows:

- **Staging Deployment**: Triggered on push to `staging` branch
- **Production Deployment**: Triggered on push to `main` branch

### Best Practices

1. **Always test in staging first** before deploying to production
2. **Use environment-specific branches** (`staging` for staging, `main` for production)
3. **Keep secrets secure** - Never commit actual API keys to the repository
4. **Use the provided npm scripts** for consistent environment management
5. **Verify deployments** after each environment change

### Troubleshooting

#### Environment Not Switching
- Verify `NODE_ENV` is set correctly
- Check that environment files exist and contain proper values
- Ensure Supabase client is importing from the correct configuration

#### Deployment Issues
- Check GitHub Actions logs for detailed error information
- Verify all required secrets are configured in repository settings
- Ensure branch protection rules allow deployment

#### Database Connection Issues
- Verify Supabase project references are correct
- Check that API keys are valid and not expired
- Ensure proper permissions are configured in Supabase
