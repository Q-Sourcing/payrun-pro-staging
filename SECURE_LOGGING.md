# Secure Logging Utility

## Overview

The secure logging utility (`src/lib/logger.ts`) provides a comprehensive logging solution that automatically filters sensitive data and implements proper logging controls for audit compliance and data protection.

## Features

### 🔒 **Automatic Sensitive Data Redaction**
- Automatically detects and redacts sensitive keywords:
  - `access_token`, `refresh_token`, `service_role_key`
  - `authorization`, `password`, `secret`, `key`, `private`
  - `token`, `bearer`, `jwt`, `auth`, `credential`
  - `api_key`, `apikey`

### 🌍 **Environment-Based Logging Control**
- **Development Mode**: All log levels enabled with `[DEV]` prefix and timestamps
- **Production Mode**: Only `warn` and `error` levels enabled (no `log` or `debug`)

### 📊 **Multiple Log Levels**
- `log()` / `info()` - General information
- `debug()` - Debug information (development only)
- `warn()` - Warning messages
- `error()` - Error messages

## Usage

### Basic Usage

```typescript
import { log, warn, error, debug } from '@/lib/logger';

// Normal logging
log('User logged in successfully');
debug('Processing user data...');
warn('Rate limit approaching');
error('Database connection failed');

// Sensitive data automatically redacted
log('User data:', {
  email: 'user@example.com',
  password: 'secret123', // Will be redacted
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Will be redacted
});
```

### Advanced Usage

```typescript
import { logger, getLoggingConfig } from '@/lib/logger';

// Using the logger object
logger.info('Application started');
logger.error('Critical error occurred');

// Get current logging configuration
const config = getLoggingConfig();
console.log('Logging config:', config);
```

## Security Features

### 1. **Automatic Redaction**
```typescript
// Input
log('Auth data:', {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  user_id: '12345'
});

// Output in development
[DEV] [2025-10-11T10:30:00.000Z] [LOG] Auth data: {
  access_token: '[REDACTED]',
  user_id: '12345'
}

// Output in production
// (No output - log() is disabled in production)
```

### 2. **Environment Controls**
```typescript
// Development mode
debug('Debug message'); // ✅ Shows: [DEV] [timestamp] [DEBUG] Debug message
log('Info message');    // ✅ Shows: [DEV] [timestamp] [LOG] Info message

// Production mode
debug('Debug message'); // ❌ No output
log('Info message');    // ❌ No output
warn('Warning');        // ✅ Shows: [timestamp] [WARN] Warning
error('Error');         // ✅ Shows: [timestamp] [ERROR] Error
```

## Migration from console.log

### Before (Insecure)
```typescript
console.log('User session:', session);
console.error('Auth failed:', error);
console.debug('API call:', { url, headers });
```

### After (Secure)
```typescript
import { log, error, debug } from '@/lib/logger';

log('User session:', session);
error('Auth failed:', error);
debug('API call:', { url, headers });
```

## Files Updated

The following files have been updated to use the secure logger:

### Core Services
- `src/lib/types/payroll-calculations.ts` - Edge Function client
- `src/hooks/use-supabase-auth.tsx` - Authentication logic
- `src/hooks/use-auth.tsx` - Auth context

### Components
- `src/components/payroll/PayRunDetailsDialog.tsx` - Pay run management
- `src/components/payroll/CreatePayRunDialog.tsx` - Pay run creation
- `src/components/payroll/PayRunsTab.tsx` - Pay runs list
- `src/components/payroll/BankScheduleExportDialog.tsx` - Bank exports
- `src/components/auth/ModernLoginForm.tsx` - Login form

## Testing

Run the test function to see the secure logger in action:

```typescript
import { testSecureLogger } from '@/lib/logger.test';

// In browser console
testSecureLogger();
```

## Benefits

### 🔐 **Security**
- Prevents accidental exposure of sensitive data
- Automatic redaction of tokens, passwords, and keys
- Audit-compliant logging

### 🎯 **Performance**
- Reduced logging in production
- Efficient string processing
- Environment-optimized output

### 🛠️ **Developer Experience**
- Consistent logging format
- Clear environment indicators
- Easy migration from console.log

### 📋 **Compliance**
- GDPR/CCPA compliant (no sensitive data in logs)
- Audit trail for security events
- Production-safe logging

## Configuration

The logger automatically detects the environment using `process.env.NODE_ENV`:

- `development` - Full logging with prefixes
- `production` - Restricted logging (warn/error only)
- `test` - Full logging for testing

## Best Practices

1. **Always use the secure logger** instead of direct console calls
2. **Use appropriate log levels**:
   - `error()` for errors that need attention
   - `warn()` for warnings and non-critical issues
   - `log()` for general information
   - `debug()` for detailed debugging info

3. **Trust the redaction** - don't manually redact data
4. **Use structured logging** with objects when possible
5. **Test in both development and production modes**

## Future Enhancements

- [ ] Log aggregation support
- [ ] Custom sensitive keyword configuration
- [ ] Log level filtering
- [ ] Performance metrics integration
- [ ] Remote logging support
