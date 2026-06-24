create extension if not exists pgcrypto;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  currency text not null default 'CNY',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.day_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  breakfast numeric(12,2),
  lunch numeric(12,2),
  dinner numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date),
  check (breakfast is null or breakfast >= 0),
  check (lunch is null or lunch >= 0),
  check (dinner is null or dinner >= 0)
);

create table if not exists public.extra_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default '其他',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_budget_id uuid references public.budgets(id) on delete set null,
  week_starts_on int not null default 1,
  meal_weights jsonb not null default '{"breakfast": 1, "lunch": 1, "dinner": 1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;
alter table public.day_records enable row level security;
alter table public.extra_expenses enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Users can view own budgets" on public.budgets;
drop policy if exists "Users can insert own budgets" on public.budgets;
drop policy if exists "Users can update own budgets" on public.budgets;
drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own day records" on public.day_records;
drop policy if exists "Users can insert own day records" on public.day_records;
drop policy if exists "Users can update own day records" on public.day_records;
drop policy if exists "Users can delete own day records" on public.day_records;
create policy "Users can view own day records" on public.day_records for select using (auth.uid() = user_id);
create policy "Users can insert own day records" on public.day_records for insert with check (auth.uid() = user_id);
create policy "Users can update own day records" on public.day_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own day records" on public.day_records for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own extra expenses" on public.extra_expenses;
drop policy if exists "Users can insert own extra expenses" on public.extra_expenses;
drop policy if exists "Users can update own extra expenses" on public.extra_expenses;
drop policy if exists "Users can delete own extra expenses" on public.extra_expenses;
create policy "Users can view own extra expenses" on public.extra_expenses for select using (auth.uid() = user_id);
create policy "Users can insert own extra expenses" on public.extra_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own extra expenses" on public.extra_expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own extra expenses" on public.extra_expenses for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own app settings" on public.app_settings;
drop policy if exists "Users can insert own app settings" on public.app_settings;
drop policy if exists "Users can update own app settings" on public.app_settings;
drop policy if exists "Users can delete own app settings" on public.app_settings;
create policy "Users can view own app settings" on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can insert own app settings" on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own app settings" on public.app_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own app settings" on public.app_settings for delete using (auth.uid() = user_id);

create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists day_records_user_date_idx on public.day_records(user_id, date);
create index if not exists extra_expenses_user_date_idx on public.extra_expenses(user_id, date);
