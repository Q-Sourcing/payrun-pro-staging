import { z } from 'zod';

// Pay run status enum
export const payRunStatusEnum = z.enum(['draft', 'pending_approval', 'approved', 'processed']);

// Base pay run schema (without refinements)
const basePayRunSchema = z.object({
  pay_run_date: z.string().date('Invalid date format').optional(),
  pay_period_start: z.string().date('Invalid date format'),
  pay_period_end: z.string().date('Invalid date format'),
  pay_group_id: z.string().uuid('Invalid pay group ID').optional(),
  pay_group_master_id: z.string().uuid('Invalid pay group master ID').optional(),
  status: payRunStatusEnum.default('draft'),
  category: z.enum(['head_office', 'projects']).optional(),
  employee_type: z.string().optional(),
  pay_frequency: z.enum(['daily', 'bi_weekly', 'monthly']).optional(),
  payroll_type: z.string().optional(),
  project_id: z.string().uuid('Invalid project ID').optional(),
  exchange_rate: z.number().min(0).optional(),
  days_worked: z.number().int().min(0).optional(),
  created_by: z.string().uuid('Invalid user ID').optional(),
});

// Create pay run schema with refinements
export const createPayRunSchema = basePayRunSchema.refine((data) => {
  // Ensure pay_group_id or pay_group_master_id is provided
  return data.pay_group_id || data.pay_group_master_id;
}, {
  message: 'Either pay_group_id or pay_group_master_id must be provided',
}).refine((data) => {
  // Ensure pay_period_end is after pay_period_start
  if (data.pay_period_start && data.pay_period_end) {
    return new Date(data.pay_period_end) >= new Date(data.pay_period_start);
  }
  return true;
}, {
  message: 'Pay period end must be after or equal to pay period start',
});

// Update pay run schema (using base schema for partial)
export const updatePayRunSchema = basePayRunSchema.partial().extend({
  id: z.string().uuid('Invalid pay run ID'),
  // Status transitions validation
  status: payRunStatusEnum.optional(),
  approved_by: z.string().uuid('Invalid user ID').optional(),
  approved_at: z.string().datetime().optional(),
  total_gross_pay: z.number().min(0).optional(),
  total_deductions: z.number().min(0).optional(),
  total_net_pay: z.number().min(0).optional(),
});

// Query options schema
export const payRunsQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  status: payRunStatusEnum.optional(),
  pay_group_id: z.string().uuid().optional(),
  pay_group_master_id: z.string().uuid().optional(),
  category: z.enum(['head_office', 'projects']).optional(),
  employee_type: z.string().optional(),
  project_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  search: z.string().optional(),
});

export type CreatePayRunInput = z.infer<typeof createPayRunSchema>;
export type UpdatePayRunInput = z.infer<typeof updatePayRunSchema>;
export type PayRunsQueryOptions = z.infer<typeof payRunsQueryOptionsSchema>;
export type PayRunStatus = z.infer<typeof payRunStatusEnum>;

