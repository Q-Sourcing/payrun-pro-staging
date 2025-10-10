# Bank Schedule Export Functionality

## Overview

The Bank Schedule Export functionality allows authorized users to generate Excel and CSV files containing payroll data organized by bank for salary payments. This feature integrates with the existing payroll system and provides separate sheets for different banks based on employee bank assignments.

## Features

### Core Functionality
- **Excel Export**: Generate multi-sheet Excel files with separate sheets for each bank
- **CSV Export**: Export individual bank data as CSV files
- **Data Preview**: Preview data before export with validation
- **Role-based Access**: Restrict access based on user roles
- **Data Validation**: Validate data completeness before export

### Bank Assignment Logic
- **Stanbic Bank**: Employees with "Stanbic Bank" in their bank name
- **Centenary Bank**: All other banks (including "Centenary Bank" and any other bank)

### Export Formats

#### Excel Format
- **Sheet Structure**: Separate sheets for each bank ("Bank-Centenary", "Bank-Stanbic")
- **Columns**: # | AccountName | BankName | AccountNumber | BankNet
- **Headers**: Company name, payroll period, printed date
- **Totals**: Row showing total net pay for each bank

#### CSV Format
- **Single Bank**: Export data for one specific bank
- **Headers**: Same structure as Excel but in CSV format
- **Comments**: Header information as comment lines

## Technical Implementation

### Components

#### 1. BankScheduleService (`src/lib/services/bank-schedule-service.ts`)
- Fetches payroll data from Supabase
- Processes and categorizes employees by bank
- Validates data completeness
- Calculates totals and summaries

#### 2. BankScheduleExporter (`src/lib/services/bank-schedule-exporter.ts`)
- Handles Excel file generation using xlsx library
- Creates CSV exports
- Formats currency values
- Generates preview data

#### 3. BankScheduleExportDialog (`src/components/payroll/BankScheduleExportDialog.tsx`)
- React component for the export interface
- Shows data preview and validation
- Handles export actions
- Provides user feedback

#### 4. Permission Hook (`src/hooks/use-bank-schedule-permissions.ts`)
- Checks user permissions for bank schedule export
- Integrates with role-based access system

### Database Integration

The system uses the following Supabase tables:
- `employees`: Bank details (bank_name, account_number)
- `pay_runs`: Payroll run information
- `pay_items`: Net pay calculations
- `pay_groups`: Pay group details

### Query Structure
```sql
SELECT 
  pi.*,
  e.name,
  e.bank_name,
  e.account_number,
  e.status
FROM pay_items pi
JOIN employees e ON pi.employee_id = e.id
WHERE pi.pay_run_id = ? 
  AND e.status = 'active'
  AND pi.net_pay > 0
```

## User Interface

### Access Points

#### 1. Pay Runs Tab
- Bank Schedule button appears for approved/processed pay runs
- Only visible to users with export permissions

#### 2. Pay Run Details Dialog
- Export Bank Schedule option in Bulk Actions dropdown
- Available in the same context as other payroll actions

### Dialog Features

#### Summary Cards
- Total employees count
- Per-bank employee counts
- Per-bank totals in local currency
- Grand total

#### Data Validation
- Missing account numbers warning
- Missing bank names warning
- Zero net pay detection
- Data completeness checks

#### Preview Table
- Shows first 5 rows of data for each bank
- Displays column headers and structure
- Indicates total number of rows

#### Export Options
- **Excel Export**: Full multi-sheet Excel file
- **CSV Export**: Individual bank CSV files
- **File Naming**: Automatic naming with date and pay run ID

## Role-Based Access Control

### Authorized Roles
- `super_admin`: Full access to all features
- `organization_admin`: Organization-wide access
- `payroll_manager`: Department-level access
- `finance_controller`: Financial oversight access
- `ceo_executive`: Executive-level access

### Permission
- `export_bank_schedule`: Required permission for all bank schedule exports

### Implementation
```typescript
const { canExportBankSchedule } = useBankSchedulePermissions();

// Button visibility
{canExportBankSchedule && (
  <Button>Export Bank Schedule</Button>
)}
```

## Data Flow

1. **User Action**: User clicks "Bank Schedule" button
2. **Permission Check**: System verifies user has export permission
3. **Data Fetch**: Service fetches payroll data from database
4. **Processing**: Data is categorized by bank and validated
5. **Preview**: User sees preview with summary and validation results
6. **Export**: User chooses export format and downloads file
7. **Audit**: Export action is logged for audit trail

## Error Handling

### Validation Errors
- Missing employee data
- Incomplete bank information
- Zero net pay amounts
- Database connection issues

### User Feedback
- Toast notifications for success/error states
- Validation warnings in dialog
- Loading states during processing
- Clear error messages

## File Formats

### Excel File Structure
```
Bank_Schedule_{payRunId}_{date}.xlsx
├── Bank-Centenary
│   ├── Headers (Company, Period, Date)
│   ├── Column Headers (#, AccountName, BankName, AccountNumber, BankNet)
│   ├── Employee Rows
│   └── Total Row
└── Bank-Stanbic
    ├── Headers (Company, Period, Date)
    ├── Column Headers (#, AccountName, BankName, AccountNumber, BankNet)
    ├── Employee Rows
    └── Total Row
```

### CSV File Structure
```
# QSourcing Uganda
# Payroll Period: 2024-01-01 to 2024-01-31
# Printed On: 2024-02-01 10:30:00
# Bank: Centenary Bank

Number,AccountName,BankName,AccountNumber,BankNet
1,"John Doe","Centenary Bank","1234567890",1500000
2,"Jane Smith","Centenary Bank","0987654321",2000000

"","","","TOTAL:",3500000
```

## Testing

### Unit Tests
- Service layer validation logic
- Exporter functionality
- Permission checks
- Data processing

### Integration Tests
- Database queries
- File generation
- UI component behavior
- Role-based access

### Test Files
- `src/lib/services/__tests__/bank-schedule-service.test.ts`
- `src/lib/services/__tests__/bank-schedule-exporter.test.ts`

## Future Enhancements

### Planned Features
- **Scheduled Exports**: Automatic export generation
- **Email Integration**: Send exports via email
- **Template Customization**: Customizable export formats
- **Bulk Processing**: Export multiple pay periods
- **Audit Trail**: Detailed export logging
- **File Storage**: Store exports in Supabase Storage

### Configuration Options
- Bank assignment rules
- Export format preferences
- Notification settings
- Access control customization

## Troubleshooting

### Common Issues

#### No Employees Found
- Verify pay run has been processed
- Check employee status is 'active'
- Ensure net pay is greater than 0

#### Missing Bank Information
- Update employee bank details
- Verify bank name format
- Check account number validity

#### Permission Denied
- Verify user role has export permission
- Check organization-level access
- Contact administrator for role assignment

#### Export Fails
- Check browser download permissions
- Verify file size limits
- Try different export format
- Refresh page and retry

## Security Considerations

### Data Protection
- Role-based access control
- Audit logging of exports
- Secure file generation
- No data persistence in browser

### Compliance
- GDPR compliance for EU employees
- Local data protection laws
- Financial data security standards
- Audit trail requirements

## API Reference

### BankScheduleService Methods

#### `generateBankSchedule(payRunId: string)`
Fetches and processes bank schedule data for a pay run.

**Parameters:**
- `payRunId`: UUID of the pay run

**Returns:**
- `Promise<BankScheduleResult>`: Processed bank schedule data

#### `validateBankSchedule(data: BankScheduleResult)`
Validates bank schedule data for completeness.

**Parameters:**
- `data`: Bank schedule data to validate

**Returns:**
- `{ isValid: boolean; errors: string[] }`: Validation result

#### `getScheduleSummary(data: BankScheduleResult)`
Generates summary statistics for bank schedule data.

**Parameters:**
- `data`: Bank schedule data

**Returns:**
- Summary object with counts and totals

### BankScheduleExporter Methods

#### `exportToExcel(data: BankScheduleResult, options?: ExcelExportOptions)`
Exports bank schedule data to Excel format.

**Parameters:**
- `data`: Bank schedule data
- `options`: Export configuration options

#### `generatePreview(data: BankScheduleResult)`
Generates preview data for the export dialog.

**Parameters:**
- `data`: Bank schedule data

**Returns:**
- Preview data with summary and table structures

#### `exportBankToCSV(bankData: BankScheduleData[], bankName: string, payRunInfo: PayRunInfo)`
Exports individual bank data to CSV format.

**Parameters:**
- `bankData`: Bank-specific employee data
- `bankName`: Name of the bank
- `payRunInfo`: Pay run information for headers

**Returns:**
- CSV content as string

## Support

For technical support or questions about the Bank Schedule Export functionality:

1. Check the troubleshooting section above
2. Review the system logs for error details
3. Contact the system administrator
4. Submit a support ticket with detailed error information

## Version History

- **v1.0.0**: Initial implementation with Excel and CSV export
- **v1.1.0**: Added role-based access control
- **v1.2.0**: Enhanced validation and preview functionality
- **v1.3.0**: Integrated with pay run workflow
