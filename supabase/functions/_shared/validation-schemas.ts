/**
 * Validation Schemas for Edge Functions
 * 
 * Uses Zod for runtime validation of request bodies.
 * Provides consistent error messages and type coercion.
 */

import { z } from 'https://esm.sh/zod@3.22.4'

// User Management Schemas
export const UpdateUserRequestSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
  email: z.string().email('Invalid email format').optional(),
  first_name: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  last_name: z.string().min(1, 'Last name cannot be empty').max(100).optional(),
  role: z.enum(['employee', 'hr_manager', 'finance', 'admin', 'super_admin']).optional(),
  is_active: z.boolean().optional(),
  permissions: z.array(z.any()).optional(),
  restrictions: z.array(z.string()).optional(),
  two_factor_enabled: z.boolean().optional(),
  session_timeout: z.number().int().min(1).max(1440).optional(),
})

export const DeleteUserRequestSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
  hard_delete: z.boolean().optional().default(false),
})

// Pay Run Schemas
export const PayRunStatusSchema = z.enum(['draft', 'pending_approval', 'approved', 'processed'])

export const CreatePayRunRequestSchema = z.object({
  pay_run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  pay_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  pay_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  pay_group_id: z.string().uuid().optional(),
  pay_group_master_id: z.string().uuid().optional(),
  status: PayRunStatusSchema.optional(),
  category: z.string().optional(),
  sub_type: z.string().optional(),
  pay_frequency: z.string().optional(),
  payroll_type: z.string().optional(),
  exchange_rate: z.number().nonnegative('Exchange rate must be non-negative').optional(),
  days_worked: z.number().int().min(0).max(31).optional(),
  created_by: z.string().uuid().optional(),
})

export const UpdatePayRunRequestSchema = z.object({
  id: z.string().uuid('Pay run ID must be a valid UUID'),
  pay_run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  pay_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  pay_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  pay_group_id: z.string().uuid().optional(),
  pay_group_master_id: z.string().uuid().optional(),
  status: PayRunStatusSchema.optional(),
  category: z.string().optional(),
  sub_type: z.string().optional(),
  pay_frequency: z.string().optional(),
  payroll_type: z.string().optional(),
  exchange_rate: z.number().nonnegative('Exchange rate must be non-negative').optional(),
  days_worked: z.number().int().min(0).max(31).optional(),
  total_gross_pay: z.number().nonnegative('Total gross pay must be non-negative').optional(),
  total_deductions: z.number().nonnegative('Total deductions must be non-negative').optional(),
  total_net_pay: z.number().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.string().datetime().optional(),
})

export const DeletePayRunRequestSchema = z.object({
  id: z.string().uuid('Pay run ID must be a valid UUID'),
  hard_delete: z.boolean().optional().default(false),
})

// Pay Item Schemas
export const PayItemStatusSchema = z.enum(['draft', 'pending', 'approved', 'paid'])

export const CreatePayItemRequestSchema = z.object({
  pay_run_id: z.string().uuid('Pay run ID must be a valid UUID'),
  employee_id: z.string().uuid('Employee ID must be a valid UUID'),
  hours_worked: z.number().nonnegative('Hours worked must be non-negative').nullable().optional(),
  pieces_completed: z.number().int().nonnegative('Pieces completed must be a non-negative integer').nullable().optional(),
  gross_pay: z.number().nonnegative('Gross pay must be non-negative'),
  tax_deduction: z.number().nonnegative('Tax deduction must be non-negative'),
  benefit_deductions: z.number().nonnegative('Benefit deductions must be non-negative'),
  employer_contributions: z.number().nonnegative('Employer contributions must be non-negative').optional(),
  status: PayItemStatusSchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const UpdatePayItemRequestSchema = z.object({
  id: z.string().uuid('Pay item ID must be a valid UUID'),
  hours_worked: z.number().nonnegative('Hours worked must be non-negative').nullable().optional(),
  pieces_completed: z.number().int().nonnegative('Pieces completed must be a non-negative integer').nullable().optional(),
  gross_pay: z.number().nonnegative('Gross pay must be non-negative').optional(),
  tax_deduction: z.number().nonnegative('Tax deduction must be non-negative').optional(),
  benefit_deductions: z.number().nonnegative('Benefit deductions must be non-negative').optional(),
  employer_contributions: z.number().nonnegative('Employer contributions must be non-negative').optional(),
  status: PayItemStatusSchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const DeletePayItemRequestSchema = z.object({
  id: z.string().uuid('Pay item ID must be a valid UUID'),
})

/**
 * Validates a request body against a Zod schema
 * Returns the validated data or throws a formatted error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Validation error: ${messages.join(', ')}`)
    }
    throw error
  }
}

