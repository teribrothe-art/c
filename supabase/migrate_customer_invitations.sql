-- 디자이너 → 고객 초대 코드 (Supabase SQL Editor에서 실행)

alter table public.treatments
  alter column customer_id drop not null;

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  designer_id uuid not null references public.profiles(id) on delete cascade,
  treatment_id uuid references public.treatments(id) on delete set null,
  customer_name text,
  customer_phone text,
  status text default 'pending' check (status in ('pending', 'used', 'expired')),
  expires_at timestamptz default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index if not exists customer_invitations_designer_id_idx
  on public.customer_invitations (designer_id, created_at desc);

create index if not exists customer_invitations_code_idx
  on public.customer_invitations (invite_code);

alter table public.customer_invitations enable row level security;

drop policy if exists "디자이너 초대 코드 관리" on public.customer_invitations;
drop policy if exists "디자이너 초대 관리" on public.customer_invitations;
create policy "디자이너 초대 코드 관리"
  on public.customer_invitations
  for all
  using (auth.uid() = designer_id);

drop policy if exists "초대 코드 조회" on public.customer_invitations;
drop policy if exists "고객 초대 코드 검증" on public.customer_invitations;
create policy "초대 코드 조회"
  on public.customer_invitations
  for select
  using (status = 'pending' and expires_at > now());

drop policy if exists "고객 초대 코드 사용" on public.customer_invitations;
create policy "고객 초대 코드 사용"
  on public.customer_invitations
  for update
  using (status = 'pending' and expires_at > now())
  with check (auth.uid() = used_by and status = 'used');

create table if not exists public.designer_customer_relationships (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  first_treatment_date date,
  total_treatments integer default 0,
  total_amount integer default 0,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  unique (designer_id, customer_id)
);

alter table public.designer_customer_relationships enable row level security;

drop policy if exists "본인 관계만 조회" on public.designer_customer_relationships;
drop policy if exists "관계 본인 조회" on public.designer_customer_relationships;
create policy "본인 관계만 조회"
  on public.designer_customer_relationships
  for select
  using (auth.uid() = designer_id or auth.uid() = customer_id);

drop policy if exists "관계 생성" on public.designer_customer_relationships;
drop policy if exists "관계 시스템 생성" on public.designer_customer_relationships;
create policy "관계 생성"
  on public.designer_customer_relationships
  for insert
  with check (auth.uid() = designer_id or auth.uid() = customer_id);

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.customer_invitations where invite_code = code
    );
  end loop;
  return code;
end;
$$;

create or replace function public.link_customer_to_designer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'used' and old.status = 'pending' and new.used_by is not null then
    insert into public.designer_customer_relationships (designer_id, customer_id)
    values (new.designer_id, new.used_by)
    on conflict (designer_id, customer_id) do nothing;

    if new.treatment_id is not null then
      update public.treatments
      set customer_id = new.used_by
      where id = new.treatment_id;
    end if;

    insert into public.notifications (user_id, type, title, message, treatment_id, href)
    values (
      new.designer_id,
      'invite_customer_joined',
      '고객 가입',
      '🎉 ' || coalesce(new.customer_name, '고객') || '님이 가입하셨어요!',
      new.treatment_id,
      '/designer/clients'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_invitation_used on public.customer_invitations;
drop trigger if exists trg_customer_invitation_used on public.customer_invitations;
create trigger on_invitation_used
  after update on public.customer_invitations
  for each row
  execute function public.link_customer_to_designer();
