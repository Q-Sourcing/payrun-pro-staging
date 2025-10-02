-- Create table for custom deductions per pay item
create table if not exists public.pay_item_custom_deductions (
  id uuid primary key default gen_random_uuid(),
  pay_item_id uuid not null,
  name text not null,
  amount numeric not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign key to pay_items with cascade delete
alter table public.pay_item_custom_deductions
  add constraint pay_item_custom_deductions_pay_item_id_fkey
  foreign key (pay_item_id) references public.pay_items(id) on delete cascade;

-- Enable RLS to match existing tables behavior
alter table public.pay_item_custom_deductions enable row level security;

-- Permissive policy (consistent with current project policies)
create policy "Allow all access to pay_item_custom_deductions"
  on public.pay_item_custom_deductions
  for all
  using (true)
  with check (true);

-- Index for faster lookups by pay_item
create index if not exists idx_custom_deductions_pay_item_id
  on public.pay_item_custom_deductions(pay_item_id);
