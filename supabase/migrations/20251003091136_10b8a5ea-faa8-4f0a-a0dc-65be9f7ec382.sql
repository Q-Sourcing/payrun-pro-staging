-- Add status column to pay_items for tracking payment status
create type public.pay_item_status as enum ('draft', 'pending', 'approved', 'paid');

alter table public.pay_items
  add column status pay_item_status not null default 'draft';

-- Create index for faster status filtering
create index if not exists idx_pay_items_status on public.pay_items(status);

-- Add employer_contributions column to track employer-side costs (like NSSF employer portion)
alter table public.pay_items
  add column employer_contributions numeric not null default 0.00;

-- Update pay_item_custom_deductions to support both deductions and benefits
alter table public.pay_item_custom_deductions
  add column type text not null default 'deduction' check (type in ('deduction', 'benefit', 'allowance'));

-- Add indices for better performance
create index if not exists idx_pay_items_pay_run_id on public.pay_items(pay_run_id);
create index if not exists idx_pay_items_employee_id on public.pay_items(employee_id);