import { z } from 'zod';
import type { UserRole, Permission } from '@/lib/types/roles';

// User role enum
export const userRoleEnum = z.enum([
  'super_admin',
  'organization_admin',
  'ceo_executive',
  'payroll_manager',
  'employee',
  'hr_business_partner',
  'finance_controller',
]);

// Create user schema
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  role: userRoleEnum,
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  department_id: z.string().max(100, 'Department ID is too long').optional(),
  manager_id: z.string().uuid('Invalid manager ID').optional(),
  is_active: z.boolean().default(true),
  two_factor_enabled: z.boolean().default(false),
  session_timeout: z.number().int().min(15, 'Session timeout must be at least 15 minutes').max(1440, 'Session timeout cannot exceed 24 hours').default(480),
  permissions: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
});

// Update user schema
export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().uuid('Invalid user ID'),
});

// Query options schema
export const usersQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  role: userRoleEnum.optional(),
  organization_id: z.string().uuid().optional(),
  department_id: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UsersQueryOptions = z.infer<typeof usersQueryOptionsSchema>;

