import { z } from 'zod';
import type { UserRole, Permission } from '@/lib/types/roles';

// User role enum
export const userRoleEnum = z.enum([
  'PLATFORM_SUPER_ADMIN',
  'PLATFORM_AUDITOR',
  'ORG_ADMIN',
  'ORG_HR_ADMIN',
  'ORG_FINANCE_CONTROLLER',
  'ORG_AUDITOR',
  'ORG_VIEWER',
  'COMPANY_PAYROLL_ADMIN',
  'COMPANY_HR',
  'COMPANY_VIEWER',
  'PROJECT_MANAGER',
  'PROJECT_PAYROLL_OFFICER',
  'PROJECT_VIEWER',
  'SELF_USER',
  'SELF_CONTRACTOR',
]);

// Create user schema
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  role: userRoleEnum,
  organization_id: z.string().uuid('Invalid organization ID').optional(),
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

