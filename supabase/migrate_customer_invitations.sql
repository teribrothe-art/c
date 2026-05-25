-- 디자이너 → 고객 초대 코드 (Supabase SQL Editor에서 실행)

alter table public.treatments
  alter column customer_id drop not null;

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  designer_id uuid not null references public.profiles(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_invitations_designer_id_idx
  on public.customer_invitations (designer_id, created_at desc);

create index if not exists customer_invitations_code_idx
  on public.customer_invitations (invite_code);

create table if not exists public.designer_customer_relationships (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  invitation_id uuid references public.customer_invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (designer_id, customer_id)
);

alter table public.customer_invitations enable row level security;
alter table public.designer_customer_relationships enable row level security;

drop policy if exists "디자이너 초대 관리" on public.customer_invitations;
create policy "디자이너 초대 관리"
  on public.customer_invitations
  for all
  using (auth.uid() = designer_id)
  with check (auth.uid() = designer_id);

drop policy if exists "고객 초대 코드 검증" on public.customer_invitations;
create policy "고객 초대 코드 검증"
  on public.customer_invitations
  for select
  using (status = 'active' and expires_at > now());

drop policy if exists "고객 초대 코드 사용" on public.customer_invitations;
create policy "고객 초대 코드 사용"
  on public.customer_invitations
  for update
  using (status = 'active' and expires_at > now())
  with check (auth.uid() = used_by and status = 'used');

drop policy if exists "관계 본인 조회" on public.designer_customer_relationships;
create policy "관계 본인 조회"
  on public.designer_customer_relationships
  for select
  using (auth.uid() = designer_id or auth.uid() = customer_id);

drop policy if exists "관계 시스템 생성" on public.designer_customer_relationships;
create policy "관계 시스템 생성"
  on public.designer_customer_relationships
  for insert
  with check (auth.uid() = customer_id or auth.uid() = designer_id);

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
      code := code || substr(chars, (floor(random() * length(chars))::int + 1), 1);
    end loop;
    exit when not exists (
      select 1 from public.customer_invitations where invite_code = code
    );
  end loop;
  return code;
end;
$$;

create or replace function public.on_invitation_used()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'used'
    and (old.status is distinct from 'used')
    and new.used_by is not null then
    insert into public.designer_customer_relationships (designer_id, customer_id, invitation_id)
    values (new.designer_id, new.used_by, new.id)
    on conflict (designer_id, customer_id) do nothing;

    update public.treatments
    set customer_id = new.used_by
    where id = new.treatment_id;

    insert into public.notifications (user_id, type, title, message, treatment_id, href)
    values (
      new.designer_id,
      'invite_customer_joined',
      '고객 가입',
      '🎉 ' || new.customer_name || '님이 가입하셨어요!',
      new.treatment_id,
      '/designer/clients'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customer_invitation_used on public.customer_invitations;
create trigger trg_customer_invitation_used
  after update on public.customer_invitations
  for each row
  execute function public.on_invitation_used();
