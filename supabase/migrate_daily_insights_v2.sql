-- daily_insights 스키마 변경 (headline / message)
-- 기존 테이블이 구 스키마인 경우 SQL Editor에서 실행

drop table if exists public.daily_insights cascade;

create table public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_date date not null default current_date,
  damage_level integer check (damage_level between 1 and 10),
  headline text not null,
  message text not null,
  viewed_at timestamptz default now(),
  unique (user_id, insight_date)
);

create index daily_insights_user_id_insight_date_idx
  on public.daily_insights (user_id, insight_date desc);

alter table public.daily_insights enable row level security;

create policy "본인 인사이트만"
  on public.daily_insights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
