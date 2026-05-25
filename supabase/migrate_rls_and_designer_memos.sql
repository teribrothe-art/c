-- 기존 DB에 적용: Supabase SQL Editor에서 실행
-- treatments SELECT 정책 분리 + designer_memos 테이블

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
