-- AI 대화 기록 (Supabase SQL Editor에서 실행)

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_message text not null,
  ai_response text not null,
  audio_url text,
  context_used jsonb,
  created_at timestamptz default now()
);

create index if not exists ai_conversations_user_id_created_at_idx
  on public.ai_conversations (user_id, created_at desc);

alter table public.ai_conversations enable row level security;

drop policy if exists "본인 대화만 조회" on public.ai_conversations;
create policy "본인 대화만 조회"
  on public.ai_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
