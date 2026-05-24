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
  customer_name text,
  treatment_date date not null,
  treatment_type text not null,
  treatment_title text not null,
  products text[],
  technique text,
  damage_level integer check (damage_level between 1 and 10),
  notes text,
  duration text,
  designer_diagnosis text,
  home_care text,
  ai_insight text,
  price integer,
  payment_status text default 'pending' check (payment_status in ('pending', 'payment_requested', 'escrow', 'completed', 'feedback_required')),
  feedback_completed boolean default false,
  payment_requested_at timestamptz,
  paid_at timestamptz,
  settled_at timestamptz,
  toss_order_id text,
  toss_payment_key text,
  platform_fee integer,
  designer_payout_amount integer,
  created_at timestamptz default now()
);

alter table public.treatments enable row level security;

-- SELECT: 고객은 본인 시술만, 디자이너는 본인이 시술한 것만
drop policy if exists "본인 시술 조회" on public.treatments;
drop policy if exists "고객은 본인 시술 조회" on public.treatments;
drop policy if exists "디자이너는 본인 시술 조회" on public.treatments;

create policy "고객은 본인 시술 조회"
  on public.treatments
  for select
  using (auth.uid() = customer_id);

create policy "디자이너는 본인 시술 조회"
  on public.treatments
  for select
  using (auth.uid() = designer_id);

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


-- 결제 내역 테이블
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references public.treatments(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  designer_id uuid not null references public.profiles(id),
  amount integer not null,
  fee_rate decimal(3, 2) default 0.04,
  fee_amount integer,
  designer_payout integer,
  status text default 'pending' check (
    status in ('pending', 'paid', 'in_escrow', 'completed', 'refunded')
  ),
  toss_payment_key text,
  toss_order_id text,
  paid_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists payments_treatment_id_key on public.payments (treatment_id);

alter table public.payments enable row level security;

drop policy if exists "결제 본인만 조회" on public.payments;
create policy "결제 본인만 조회"
  on public.payments
  for select
  using (auth.uid() = customer_id or auth.uid() = designer_id);

drop policy if exists "결제 생성" on public.payments;
create policy "결제 생성"
  on public.payments
  for insert
  with check (auth.uid() = customer_id);

drop policy if exists "결제 업데이트" on public.payments;
create policy "결제 업데이트"
  on public.payments
  for update
  using (auth.uid() = customer_id or auth.uid() = designer_id);


-- Day 5+ 시술 기록 상세 컬럼
alter table public.treatments
  add column if not exists duration text,
  add column if not exists designer_diagnosis text,
  add column if not exists home_care text,
  add column if not exists ai_insight text;


-- 정산 관련 컬럼
alter table public.treatments
  add column if not exists customer_name text,
  add column if not exists price integer,
  add column if not exists payment_status text default 'pending' check (payment_status in ('pending', 'payment_requested', 'escrow', 'completed', 'feedback_required')),
  add column if not exists feedback_completed boolean default false;


-- 디자이너 시술 입력 컬럼
alter table public.treatments
  add column if not exists technique text;


-- 디자이너 전용 메모 (시술별 비공개 메모)
create table if not exists public.designer_memos (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references public.treatments(id) on delete cascade,
  designer_id uuid not null references public.profiles(id),
  memo text,
  created_at timestamptz not null default now()
);

alter table public.designer_memos enable row level security;

drop policy if exists "디자이너 메모 본인만" on public.designer_memos;
create policy "디자이너 메모 본인만"
  on public.designer_memos
  for all
  using (auth.uid() = designer_id)
  with check (auth.uid() = designer_id);

-- 시술 전후 사진 URL
alter table public.treatments
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text;


-- Storage: treatment-photos 버킷 (Supabase 대시보드에서도 생성 가능)
insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', false)
on conflict (id) do nothing;

drop policy if exists "본인 사진 업로드" on storage.objects;
create policy "본인 사진 업로드"
  on storage.objects
  for insert
  with check (
    bucket_id = 'treatment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "사진 조회 권한" on storage.objects;
create policy "사진 조회 권한"
  on storage.objects
  for select
  using (
    bucket_id = 'treatment-photos'
    and auth.uid() is not null
  );
