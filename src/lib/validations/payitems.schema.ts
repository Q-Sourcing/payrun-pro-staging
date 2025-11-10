import { z } from 'zod';

// Pay item status enum
export const payItemStatusEnum = z.enum(['draft', 'pending', 'approved', 'paid']);

// Create pay item schema
export const createPayItemSchema = z.object({
  pay_run_id: z.string().uuid('Invalid pay run ID'),
  employee_id: z.string().uuid('Invalid employee ID'),
  hours_worked: z.number().min(0).nullable().optional(),
  pieces_completed: z.number().int().min(0).nullable().optional(),
  gross_pay: z.number().min(0).default(0),
  tax_deduction: z.number().min(0).default(0),
  benefit_deductions: z.number().min(0).default(0),
  employer_contributions: z.number().min(0).default(0),
  total_deductions: z.number().min(0).default(0),
  net_pay: z.number().min(0).default(0),
  status: payItemStatusEnum.default('pending'),
  notes: z.string().max(1000, 'Notes are too long').nullable().optional(),
}).refine((data) => {
  // Ensure either hours_worked or pieces_completed is provided
  return data.hours_worked !== null || data.pieces_completed !== null;
}, {
  message: 'Either hours_worked or pieces_completed must be provided',
}).refine((data) => {
  // Validate calculation: net_pay = gross_pay - total_deductions
  const calculatedNetPay = data.gross_pay - data.total_deductions;
  return Math.abs(data.net_pay - calculatedNetPay) < 0.01; // Allow small floating point differences
}, {
  message: 'Net pay must equal gross pay minus total deductions',
}).refine((data) => {
  // Validate total_deductions = tax_deduction + benefit_deductions
  const calculatedTotalDeductions = data.tax_deduction + data.benefit_deductions;
  return Math.abs(data.total_deductions - calculatedTotalDeductions) < 0.01;
}, {
  message: 'Total deductions must equal tax deduction plus benefit deductions',
});

// Update pay item schema
export const updatePayItemSchema = createPayItemSchema.partial().extend({
  id: z.string().uuid('Invalid pay item ID'),
});

// Query options schema
export const payItemsQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  pay_run_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  status: payItemStatusEnum.optional(),
  search: z.string().optional(),
});

export type CreatePayItemInput = z.infer<typeof createPayItemSchema>;
export type UpdatePayItemInput = z.infer<typeof updatePayItemSchema>;
export type PayItemsQueryOptions = z.infer<typeof payItemsQueryOptionsSchema>;
export type PayItemStatus = z.infer<typeof payItemStatusEnum>;

