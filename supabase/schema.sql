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
  customer_id uuid references public.profiles(id) on delete cascade,
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
  created_at timestamptz default now(),
  receipt_url text,
  refund_amount integer default 0,
  refund_reason text,
  refunded_at timestamptz
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
  treatment_id uuid not null references public.treatments(id),
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


create or replace view public.designer_revenue
with (security_invoker = true) as
select
  designer_id,
  date_trunc('month', settled_at) as month,
  count(*) as treatment_count,
  sum(amount) as gross_revenue,
  sum(fee_amount) as total_fees,
  sum(designer_payout) as net_payout
from public.payments
where status = 'completed'
  and settled_at is not null
group by designer_id, date_trunc('month', settled_at);

grant select on public.designer_revenue to authenticated;


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


-- AI 대화 기록
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


-- 알림
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


-- 매일 본 인사이트 기록
create table if not exists public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_date date not null default current_date,
  damage_level integer check (damage_level between 1 and 10),
  headline text not null,
  message text not null,
  viewed_at timestamptz default now(),
  unique (user_id, insight_date)
);

create index if not exists daily_insights_user_id_insight_date_idx
  on public.daily_insights (user_id, insight_date desc);

alter table public.daily_insights enable row level security;

drop policy if exists "본인 인사이트만" on public.daily_insights;
create policy "본인 인사이트만"
  on public.daily_insights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 디자이너 → 고객 초대 코드
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

alter table public.customer_invitations enable row level security;
alter table public.designer_customer_relationships enable row level security;

drop policy if exists "디자이너 초대 코드 관리" on public.customer_invitations;
create policy "디자이너 초대 코드 관리"
  on public.customer_invitations
  for all
  using (auth.uid() = designer_id);

drop policy if exists "초대 코드 조회" on public.customer_invitations;
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

drop policy if exists "본인 관계만 조회" on public.designer_customer_relationships;
create policy "본인 관계만 조회"
  on public.designer_customer_relationships
  for select
  using (auth.uid() = designer_id or auth.uid() = customer_id);

drop policy if exists "관계 생성" on public.designer_customer_relationships;
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

grant execute on function public.generate_invite_code() to authenticated;

create or replace function public.link_customer_to_designer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'used' and old.status in ('pending', 'active') and new.used_by is not null then
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

create or replace function public.apply_customer_invite(
  p_invitation_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.customer_invitations%rowtype;
begin
  select * into inv
  from public.customer_invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  insert into public.designer_customer_relationships (designer_id, customer_id)
  values (inv.designer_id, p_customer_id)
  on conflict (designer_id, customer_id) do nothing;

  if inv.treatment_id is not null then
    update public.treatments
    set customer_id = p_customer_id
    where id = inv.treatment_id;
  end if;
end;
$$;

grant execute on function public.apply_customer_invite(uuid, uuid) to authenticated;

create or replace function public.search_registered_customers(
  p_query text default '',
  p_limit int default 40
)
returns table(id uuid, name text, email text, linked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  designer uuid := auth.uid();
  q text := trim(coalesce(p_query, ''));
begin
  if designer is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(trim(p.name), ''), '고객') as name,
    coalesce(p.email, '') as email,
    exists (
      select 1
      from public.designer_customer_relationships r
      where r.designer_id = designer
        and r.customer_id = p.id
    ) as linked
  from public.profiles p
  where p.role = 'customer'
    and (
      q = ''
      or p.name ilike '%' || q || '%'
      or p.email ilike '%' || q || '%'
    )
  order by linked desc, p.name asc nulls last
  limit greatest(1, least(p_limit, 50));
end;
$$;

grant execute on function public.search_registered_customers(text, int) to authenticated;

create or replace function public.link_customer_to_treatment(
  p_treatment_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  designer uuid := auth.uid();
  t record;
  c record;
begin
  if designer is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into t
  from public.treatments
  where id = p_treatment_id
    and designer_id = designer;

  if not found then
    raise exception 'TREATMENT_NOT_FOUND';
  end if;

  if t.customer_id is not null then
    raise exception 'ALREADY_LINKED';
  end if;

  select * into c
  from public.profiles
  where id = p_customer_id
    and role = 'customer';

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  update public.treatments
  set
    customer_id = p_customer_id,
    customer_name = coalesce(nullif(trim(c.name), ''), t.customer_name)
  where id = p_treatment_id;

  insert into public.designer_customer_relationships (designer_id, customer_id, status)
  values (designer, p_customer_id, 'active')
  on conflict (designer_id, customer_id) do nothing;

  update public.customer_invitations
  set status = 'expired'
  where treatment_id = p_treatment_id
    and designer_id = designer
    and status in ('pending', 'active');

  insert into public.notifications (user_id, type, title, message, treatment_id, href, read)
  values (
    p_customer_id,
    'treatment_recorded',
    '시술 기록',
    coalesce(t.treatment_title, '시술') || ' 시술이 다이어리에 추가됐어요.',
    p_treatment_id,
    '/treatment/' || p_treatment_id::text,
    false
  );

  insert into public.notifications (user_id, type, title, message, treatment_id, href, read)
  values (
    designer,
    'invite_customer_joined',
    '고객 연결',
    '✓ ' || coalesce(nullif(trim(c.name), ''), '고객') || '님과 연결됐어요.',
    p_treatment_id,
    '/designer/clients',
    false
  );
end;
$$;

grant execute on function public.link_customer_to_treatment(uuid, uuid) to authenticated;

create or replace function public.create_app_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_treatment_id uuid default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, treatment_id, href, read)
  values (p_user_id, p_type, p_title, p_message, p_treatment_id, p_href, false)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_app_notification(uuid, text, text, text, uuid, text) to authenticated;
