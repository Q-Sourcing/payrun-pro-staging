# Zoho People Integration Documentation

## Overview

This document provides comprehensive documentation for the Zoho People integration with the Q-Payroll application. The integration enables bidirectional synchronization of employee data, attendance records, leave requests, and payroll information between Zoho People and the payroll system.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication](#authentication)
3. [Data Synchronization](#data-synchronization)
4. [API Endpoints](#api-endpoints)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Architecture

### Components

The integration consists of several key components:

- **ZohoAuthService**: Handles OAuth 2.0 authentication with Zoho People
- **ZohoPeopleAPI**: API client for interacting with Zoho People endpoints
- **ZohoSyncService**: Manages data synchronization between systems
- **ZohoMonitoringService**: Provides health monitoring and alerting
- **ZohoPeopleIntegration**: Main integration class that orchestrates all services

### Data Flow

```
Zoho People ←→ OAuth 2.0 ←→ Integration Layer ←→ Payroll Database
     ↓              ↓              ↓                    ↓
Employee Data   Authentication   Sync Service      Payroll Records
Attendance     Token Management  Data Mapping      Audit Logs
Leave Requests Rate Limiting     Error Handling    Health Metrics
Salary Data    Security         Monitoring        Alerts
```

## Authentication

### OAuth 2.0 Setup

1. **Register Application in Zoho Developer Console**
   - Go to [Zoho Developer Console](https://api-console.zoho.com/)
   - Create a new application
   - Configure redirect URI: `https://yourdomain.com/auth/zoho/callback`
   - Note down Client ID and Client Secret

2. **Configure Environment Variables**
   ```env
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
   ZOHO_SCOPE=ZohoPeople.employees.ALL,ZohoPeople.attendance.ALL,ZohoPeople.leave.ALL
   ```

3. **Initialize Authentication**
   ```typescript
   import { ZohoPeopleIntegration } from '@/integrations/zoho';
   
   const config = {
     clientId: process.env.ZOHO_CLIENT_ID,
     clientSecret: process.env.ZOHO_CLIENT_SECRET,
     redirectUri: process.env.ZOHO_REDIRECT_URI,
     scope: process.env.ZOHO_SCOPE,
     apiBaseUrl: 'https://people.zoho.com/people/api',
     environment: 'production'
   };
   
   const integration = new ZohoPeopleIntegration(config);
   await integration.initialize();
   ```

### Token Management

The integration automatically handles:
- Access token refresh
- Token storage in encrypted database
- Token expiration monitoring
- Re-authentication when needed

## Data Synchronization

### Synchronization Types

#### 1. Employee Data Sync (Inbound)
- **Frequency**: Real-time on profile changes
- **Data**: Name, email, department, position, salary, bank details
- **Mapping**: Zoho fields → Payroll database fields

#### 2. Attendance Sync (Inbound)
- **Frequency**: Daily (overnight)
- **Data**: Check-in/out times, hours worked, overtime
- **Processing**: Calculates total hours and overtime

#### 3. Leave Sync (Inbound)
- **Frequency**: Real-time on status changes
- **Data**: Leave requests, approvals, balances
- **Integration**: Updates payroll calculations

#### 4. Payroll Sync (Outbound)
- **Frequency**: Post-payroll processing
- **Data**: Payroll results, payslip links, deductions
- **Delivery**: Updates Zoho People records

### Data Mapping

| Zoho People Field | Payroll Field | Transformation |
|------------------|---------------|----------------|
| EmployeeID | employee_code | Direct mapping |
| Email | work_email | Direct mapping |
| Department | cost_center | Direct mapping |
| BasicSalary | monthly_base_salary | Direct mapping |
| BankAccountNumber | bank_account | Direct mapping |
| DateOfJoining | hire_date | Direct mapping |
| EmploymentStatus | employee_status | Status mapping |

## API Endpoints

### Zoho People APIs Used

#### Employee Management
- `GET /api/employees/v1/employees` - List employees
- `GET /api/employees/v1/employees/{id}` - Get employee details
- `POST /api/employees/v1/employees` - Create employee
- `PUT /api/employees/v1/employees/{id}` - Update employee
- `DELETE /api/employees/v1/employees/{id}` - Delete employee

#### Attendance Management
- `GET /api/attendance/v1/records` - Get attendance records
- `POST /api/attendance/v1/records` - Create attendance record
- `PUT /api/attendance/v1/records/{id}` - Update attendance record

#### Leave Management
- `GET /api/leave/v1/requests` - Get leave requests
- `POST /api/leave/v1/requests` - Create leave request
- `PUT /api/leave/v1/requests/{id}` - Update leave request

#### Salary Management
- `GET /api/payroll/v1/salary` - Get salary information
- `POST /api/payroll/v1/salary` - Update salary information

### Payroll App APIs

#### Employee Management
- `GET /api/v1/employees` - List employees
- `POST /api/v1/employees` - Create employee
- `PUT /api/v1/employees/{id}` - Update employee
- `DELETE /api/v1/employees/{id}` - Delete employee

#### Payroll Processing
- `GET /api/v1/payruns` - List pay runs
- `POST /api/v1/payruns` - Create pay run
- `GET /api/v1/payruns/{id}` - Get pay run details
- `POST /api/v1/payruns/{id}/process` - Process pay run

#### Payslip Management
- `GET /api/v1/payslips` - List payslips
- `GET /api/v1/payslips/{id}` - Get payslip
- `POST /api/v1/payslips/{id}/generate` - Generate payslip

## Configuration

### Database Setup

Run the migration to create required tables:

```bash
supabase migration up
```

This creates the following tables:
- `integration_tokens` - OAuth token storage
- `sync_configurations` - Sync settings
- `sync_logs` - Sync operation logs
- `integration_health` - Health monitoring data
- `alert_rules` - Alert configuration
- `notification_channels` - Notification settings
- `audit_logs` - Audit trail
- `attendance_records` - Attendance data

### Sync Configuration

Configure synchronization settings:

```typescript
const syncConfig = {
  name: 'Employee Sync',
  enabled: true,
  frequency: 'realtime',
  direction: 'inbound',
  dataMapping: [
    {
      zohoField: 'EmployeeID',
      payrollField: 'employee_code',
      required: true
    },
    {
      zohoField: 'Email',
      payrollField: 'work_email',
      required: true
    }
  ],
  retryAttempts: 3,
  timeout: 30000
};
```

### Alert Configuration

Set up monitoring alerts:

```typescript
const alertRule = {
  name: 'High Error Rate',
  condition: 'error_rate_high',
  threshold: 20,
  enabled: true,
  notificationChannels: ['email', 'slack'],
  escalationLevel: 1
};
```

## Monitoring

### Health Dashboard

The integration provides a comprehensive health dashboard showing:

- **Integration Status**: Healthy, Warning, Critical
- **API Performance**: Response times, success rates
- **Sync Statistics**: Total syncs, success/failure rates
- **Error Monitoring**: Error rates, failed operations
- **Uptime**: System availability percentage

### Key Metrics

- **API Response Time**: < 2 seconds (target)
- **Success Rate**: > 99% (target)
- **Error Rate**: < 1% (target)
- **Sync Frequency**: Configurable (default: 15 minutes)
- **Data Volume**: Tracked per sync operation

### Alerting

The system provides alerts for:

- High error rates (> 20%)
- Slow API responses (> 5 seconds)
- Sync failures
- Authentication issues
- System downtime

## Security

### Data Protection

- **Encryption at Rest**: AES-256 encryption for sensitive data
- **Encryption in Transit**: TLS 1.3 for all API communications
- **Token Security**: Encrypted storage of OAuth tokens
- **Access Control**: Role-based permissions for integration management

### Compliance

- **GDPR Compliance**: Data anonymization and retention policies
- **Audit Trail**: Comprehensive logging of all operations
- **Data Retention**: Automatic cleanup of old logs (90 days)
- **Security Audits**: Regular penetration testing

### Best Practices

1. **Environment Variables**: Store sensitive data in environment variables
2. **Rate Limiting**: Respect API rate limits
3. **Error Handling**: Implement comprehensive error handling
4. **Logging**: Log all operations for audit purposes
5. **Monitoring**: Set up alerts for critical issues

## Troubleshooting

### Common Issues

#### Authentication Failures
- **Issue**: OAuth token expired
- **Solution**: Re-authenticate with Zoho People
- **Prevention**: Automatic token refresh

#### Sync Failures
- **Issue**: Data mapping errors
- **Solution**: Check field mappings in configuration
- **Prevention**: Validate data before processing

#### API Rate Limiting
- **Issue**: Too many API requests
- **Solution**: Implement exponential backoff
- **Prevention**: Respect rate limits (1 request/second)

#### Data Validation Errors
- **Issue**: Invalid data format
- **Solution**: Implement data validation
- **Prevention**: Check data before sync

### Debug Mode

Enable debug logging:

```typescript
const config = {
  // ... other config
  debug: true,
  logLevel: 'debug'
};
```

### Health Check

Test integration health:

```typescript
const health = await integration.getMonitoringService().getCurrentHealth();
console.log('Integration Status:', health.status);
console.log('API Response Time:', health.apiResponseTime);
console.log('Error Rate:', health.errorRate);
```

## API Reference

### ZohoPeopleIntegration

Main integration class.

#### Methods

```typescript
// Initialize integration
await integration.initialize(): Promise<void>

// Test integration
await integration.testIntegration(): Promise<TestResult>

// Shutdown integration
await integration.shutdown(): Promise<void>
```

### ZohoAuthService

Authentication service.

#### Methods

```typescript
// Generate auth URL
generateAuthUrl(state?: string): string

// Exchange code for tokens
await exchangeCodeForTokens(code: string): Promise<ZohoAuthTokens>

// Get valid access token
await getValidAccessToken(): Promise<string>

// Check authentication status
await isAuthenticated(): Promise<boolean>
```

### ZohoPeopleAPI

API client for Zoho People.

#### Methods

```typescript
// Employee management
await getEmployees(params?: GetEmployeesParams): Promise<EmployeeResponse>
await getEmployee(id: string): Promise<ZohoEmployee>
await createEmployee(employee: Partial<ZohoEmployee>): Promise<ZohoEmployee>
await updateEmployee(id: string, updates: Partial<ZohoEmployee>): Promise<ZohoEmployee>

// Attendance management
await getAttendanceRecords(params: AttendanceParams): Promise<AttendanceResponse>
await createAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord>

// Leave management
await getLeaveRequests(params: LeaveParams): Promise<LeaveResponse>
await createLeaveRequest(request: LeaveRequest): Promise<LeaveRequest>

// Test connection
await testConnection(): Promise<boolean>
```

### ZohoSyncService

Data synchronization service.

#### Methods

```typescript
// Sync employees from Zoho
await syncEmployeesFromZoho(params?: SyncParams): Promise<SyncStatus>

// Sync attendance from Zoho
await syncAttendanceFromZoho(params: AttendanceSyncParams): Promise<SyncStatus>

// Sync payroll to Zoho
await syncPayrollToZoho(payRunId: string): Promise<SyncStatus>

// Get sync status
await getSyncStatus(): Promise<SyncStatusSummary>
```

### ZohoMonitoringService

Health monitoring service.

#### Methods

```typescript
// Start health monitoring
startHealthMonitoring(intervalMs?: number): void

// Stop health monitoring
stopHealthMonitoring(): void

// Get current health
await getCurrentHealth(): Promise<IntegrationHealth>

// Get audit logs
await getAuditLogs(params?: AuditParams): Promise<AuditLog[]>
```

## Support

For technical support and questions:

- **Documentation**: This file and inline code comments
- **Issues**: Create GitHub issues for bugs
- **Questions**: Contact the development team
- **Training**: Video tutorials and knowledge base

## Changelog

### Version 1.0.0
- Initial release
- OAuth 2.0 authentication
- Employee data synchronization
- Attendance record sync
- Leave request sync
- Payroll result sync
- Health monitoring
- Alert system
- Comprehensive logging
