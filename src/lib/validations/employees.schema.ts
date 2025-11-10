import { z } from 'zod';

// Employee validation schemas
export const createEmployeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  middle_name: z.string().max(100, 'Middle name is too long').optional(),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  employee_type: z.string().min(1, 'Employee type is required'),
  employee_category: z.enum(['Intern', 'Trainee', 'Temporary', 'Permanent', 'On Contract', 'Casual']).optional(),
  employment_status: z.enum(['Active', 'Terminated', 'Deceased', 'Resigned', 'Probation', 'Notice Period']).optional(),
  department: z.string().max(100, 'Department name is too long').optional(),
  project: z.string().max(100, 'Project name is too long').optional(),
  country: z.string().min(2, 'Country is required').max(2, 'Country code must be 2 characters'),
  pay_type: z.enum(['hourly', 'salary', 'piece_rate', 'daily_rate']),
  pay_rate: z.number().min(0, 'Pay rate must be positive'),
  pay_frequency: z.enum(['daily', 'bi_weekly', 'monthly']).optional(),
  pay_group_id: z.string().uuid('Invalid pay group ID').optional(),
  // Personal details
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  date_of_birth: z.string().date().optional(),
  national_id: z.string().max(50, 'National ID is too long').optional(),
  tin: z.string().max(50, 'TIN is too long').optional(),
  nssf_number: z.string().max(50, 'NSSF number is too long').optional(),
  social_security_number: z.string().max(50, 'Social security number is too long').optional(),
  passport_number: z.string().max(50, 'Passport number is too long').optional(),
  // Bank details
  bank_name: z.string().max(100, 'Bank name is too long').optional(),
  bank_branch: z.string().max(100, 'Bank branch is too long').optional(),
  account_number: z.string().max(50, 'Account number is too long').optional(),
  account_type: z.string().max(50, 'Account type is too long').optional(),
  currency: z.string().max(3, 'Currency code must be 3 characters').optional(),
  // Category and sub_type for hierarchical structure
  category: z.enum(['head_office', 'projects']).optional(),
  sub_type: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  id: z.string().uuid('Invalid employee ID'),
});

export const employeeQueryOptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  employee_type: z.string().optional(),
  include_pay_group: z.boolean().optional(),
  department: z.string().optional(),
  employment_status: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQueryOptions = z.infer<typeof employeeQueryOptionsSchema>;

