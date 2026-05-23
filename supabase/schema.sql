-- Run this in the Supabase SQL editor before testing signup.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null check (role in ('customer', 'designer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- 시술 기록 테이블
create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  designer_id uuid references public.profiles(id),
  designer_name text,
  treatment_date date not null,
  treatment_type text not null,
  treatment_title text not null,
  products text[],
  damage_level integer check (damage_level between 1 and 10),
  notes text,
  created_at timestamptz default now()
);

alter table public.treatments enable row level security;

drop policy if exists "본인 시술 조회" on public.treatments;
create policy "본인 시술 조회"
  on public.treatments
  for select
  using (auth.uid() = customer_id or auth.uid() = designer_id);

drop policy if exists "본인 시술 생성" on public.treatments;
create policy "본인 시술 생성"
  on public.treatments
  for insert
  with check (auth.uid() = customer_id or auth.uid() = designer_id);

drop policy if exists "본인 시술 수정" on public.treatments;
create policy "본인 시술 수정"
  on public.treatments
  for update
  using (auth.uid() = customer_id or auth.uid() = designer_id)
  with check (auth.uid() = customer_id or auth.uid() = designer_id);
