-- Supabase SQL Editor에서 실행 — 디자이너가 가입 고객 검색·연결

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
