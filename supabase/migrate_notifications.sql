-- 알림 (Supabase SQL Editor에서 실행)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null default '',
  message text not null,
  treatment_id uuid references public.treatments(id) on delete set null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "본인 알림만" on public.notifications;
create policy "본인 알림만"
  on public.notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
