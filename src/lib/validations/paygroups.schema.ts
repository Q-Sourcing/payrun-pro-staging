import { z } from 'zod';
import type { PayGroupCategory, HeadOfficeSubType, ProjectsSubType, ManpowerFrequency } from '@/lib/types/paygroups';

// Base pay group schema
const basePayGroupSchema = z.object({
  name: z.string().min(1, 'Pay group name is required').max(255, 'Pay group name is too long'),
  country: z.string().min(2, 'Country is required').max(2, 'Country code must be 2 characters'),
  currency: z.string().min(3, 'Currency is required').max(3, 'Currency code must be 3 characters'),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  category: z.enum(['head_office', 'projects']).optional(),
  sub_type: z.string().optional(),
  pay_frequency: z.enum(['daily', 'bi_weekly', 'monthly']).optional(),
});

// Regular pay group schema
export const createRegularPayGroupSchema = basePayGroupSchema.extend({
  type: z.literal('regular'),
  pay_frequency: z.enum(['weekly', 'bi_weekly', 'monthly', 'quarterly']),
  default_tax_percentage: z.number().min(0, 'Tax percentage must be 0 or greater').max(100, 'Tax percentage cannot exceed 100'),
});

// Expatriate pay group schema
export const createExpatriatePayGroupSchema = basePayGroupSchema.extend({
  type: z.literal('expatriate'),
  exchange_rate_to_local: z.number().min(0.0001, 'Exchange rate must be greater than 0'),
  default_daily_rate: z.number().min(0, 'Daily rate must be 0 or greater').optional(),
  tax_country: z.string().min(2, 'Tax country is required').max(2, 'Tax country code must be 2 characters'),
});

// Contractor pay group schema
export const createContractorPayGroupSchema = basePayGroupSchema.extend({
  type: z.literal('contractor'),
  contract_duration: z.number().int().min(1, 'Contract duration must be at least 1 month').max(60, 'Contract duration cannot exceed 60 months'),
  default_hourly_rate: z.number().min(0, 'Hourly rate must be 0 or greater'),
  tax_country: z.string().min(2, 'Tax country is required').max(2, 'Tax country code must be 2 characters'),
});

// Intern pay group schema
export const createInternPayGroupSchema = basePayGroupSchema.extend({
  type: z.literal('intern'),
  internship_duration: z.number().int().min(1, 'Internship duration must be at least 1 month').max(12, 'Internship duration cannot exceed 12 months'),
  stipend_amount: z.number().min(0, 'Stipend amount must be 0 or greater'),
  academic_institution: z.string().max(255, 'Academic institution name is too long').optional(),
});

// Union schema for create
export const createPayGroupSchema = z.discriminatedUnion('type', [
  createRegularPayGroupSchema,
  createExpatriatePayGroupSchema,
  createContractorPayGroupSchema,
  createInternPayGroupSchema,
]);

// Update schemas (all fields optional except id and type)
export const updateRegularPayGroupSchema = createRegularPayGroupSchema.partial().extend({
  id: z.string().uuid('Invalid pay group ID'),
  type: z.literal('regular'),
});

export const updateExpatriatePayGroupSchema = createExpatriatePayGroupSchema.partial().extend({
  id: z.string().uuid('Invalid pay group ID'),
  type: z.literal('expatriate'),
});

export const updateContractorPayGroupSchema = createContractorPayGroupSchema.partial().extend({
  id: z.string().uuid('Invalid pay group ID'),
  type: z.literal('contractor'),
});

export const updateInternPayGroupSchema = createInternPayGroupSchema.partial().extend({
  id: z.string().uuid('Invalid pay group ID'),
  type: z.literal('intern'),
});

export const updatePayGroupSchema = z.discriminatedUnion('type', [
  updateRegularPayGroupSchema,
  updateExpatriatePayGroupSchema,
  updateContractorPayGroupSchema,
  updateInternPayGroupSchema,
]);

// Query options schema
export const payGroupsQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  type: z.enum(['regular', 'expatriate', 'contractor', 'intern', 'all']).optional(),
  search: z.string().optional(),
  include_employee_count: z.boolean().optional(),
  category: z.enum(['head_office', 'projects']).optional(),
  sub_type: z.string().optional(),
});

export type CreateRegularPayGroupInput = z.infer<typeof createRegularPayGroupSchema>;
export type CreateExpatriatePayGroupInput = z.infer<typeof createExpatriatePayGroupSchema>;
export type CreateContractorPayGroupInput = z.infer<typeof createContractorPayGroupSchema>;
export type CreateInternPayGroupInput = z.infer<typeof createInternPayGroupSchema>;
export type CreatePayGroupInput = z.infer<typeof createPayGroupSchema>;

export type UpdateRegularPayGroupInput = z.infer<typeof updateRegularPayGroupSchema>;
export type UpdateExpatriatePayGroupInput = z.infer<typeof updateExpatriatePayGroupSchema>;
export type UpdateContractorPayGroupInput = z.infer<typeof updateContractorPayGroupSchema>;
export type UpdateInternPayGroupInput = z.infer<typeof updateInternPayGroupSchema>;
export type UpdatePayGroupInput = z.infer<typeof updatePayGroupSchema>;

export type PayGroupsQueryOptions = z.infer<typeof payGroupsQueryOptionsSchema>;

