import { z } from 'zod';

// Benefit type enum
export const benefitTypeEnum = z.enum(['health_insurance', 'retirement', 'dental', 'vision', 'other']);

// Cost type enum
export const costTypeEnum = z.enum(['fixed', 'percentage']);

// Create benefit schema
export const createBenefitSchema = z.object({
  name: z.string().min(1, 'Benefit name is required').max(255, 'Benefit name is too long'),
  cost: z.number().min(0, 'Cost must be 0 or greater'),
  cost_type: costTypeEnum.default('fixed'),
  benefit_type: benefitTypeEnum.default('other'),
  applicable_countries: z.array(z.string().length(2, 'Country code must be 2 characters')).default([]),
});

// Update benefit schema
export const updateBenefitSchema = createBenefitSchema.partial().extend({
  id: z.string().uuid('Invalid benefit ID'),
});

// Query options schema
export const benefitsQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  benefit_type: benefitTypeEnum.optional(),
  country: z.string().length(2).optional(),
  cost_type: costTypeEnum.optional(),
  search: z.string().optional(),
});

export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;
export type BenefitsQueryOptions = z.infer<typeof benefitsQueryOptionsSchema>;
export type BenefitType = z.infer<typeof benefitTypeEnum>;
export type CostType = z.infer<typeof costTypeEnum>;

