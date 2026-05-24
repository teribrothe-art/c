-- 결제 내역 테이블 + RLS (Supabase SQL Editor에서 실행)

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
