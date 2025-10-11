# Calculate Pay Edge Function

This Supabase Edge Function handles server-side payroll calculations for the Q-Payroll system.

## Overview

The function provides secure, auditable payroll calculations by moving the calculation logic from client-side to server-side. It supports multiple countries with their specific tax rules and deduction structures.

## Features

- **Multi-country Support**: Uganda, Kenya, Tanzania, Rwanda, South Sudan
- **Progressive Tax Calculations**: PAYE tax with country-specific brackets
- **Social Security Contributions**: NSSF, RSSB, and other country-specific schemes
- **Custom Deductions**: Benefits, allowances, and other custom items
- **Audit Logging**: All calculations are logged for compliance
- **Error Handling**: Graceful fallback and detailed error reporting

## API Endpoint

```
POST /functions/v1/calculate-pay
```

## Request Body

```typescript
{
  employee_id: string;
  pay_run_id?: string;
  hours_worked?: number;
  pieces_completed?: number;
  pay_rate?: number;
  pay_type?: 'hourly' | 'piece_rate' | 'salary';
  employee_type?: 'local' | 'expatriate';
  country?: string;
  custom_deductions?: Array<{
    name: string;
    amount: number;
    type: 'benefit' | 'deduction' | 'allowance';
  }>;
  benefit_deductions?: number;
}
```

## Response

```typescript
{
  success: boolean;
  data: {
    gross_pay: number;
    paye_tax: number;
    nssf_employee: number;
    nssf_employer: number;
    total_deductions: number;
    net_pay: number;
    employer_contributions: number;
    breakdown: Array<{
      description: string;
      amount: number;
      type: 'addition' | 'deduction';
    }>;
    standard_deductions: { [key: string]: number };
  };
  employee: {
    id: string;
    name: string;
  };
}
```

## Deployment

```bash
# Deploy the function
supabase functions deploy calculate-pay

# Test locally
supabase functions serve calculate-pay
```

## Environment Variables

The function requires these environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Database Dependencies

- `employees` table: Employee master data
- `pay_calculation_audit_log` table: Audit logging (created by migration)

## Security

- Uses service role key for database access
- Implements proper CORS headers
- Validates all input data
- Logs all calculations for audit purposes

## Error Handling

The function includes comprehensive error handling:

- Input validation
- Database connection errors
- Calculation errors
- Graceful fallback mechanisms

## Testing

Test the function with various scenarios:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/calculate-pay' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "employee_id": "employee-uuid",
    "pay_rate": 1000000,
    "pay_type": "salary",
    "employee_type": "local",
    "country": "Uganda"
  }'
```
