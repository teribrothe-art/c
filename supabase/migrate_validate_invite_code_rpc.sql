-- 가입 전(anon) 초대 코드 검증 — RLS·status(active) 이슈 우회

drop policy if exists "초대 코드 조회" on public.customer_invitations;
create policy "초대 코드 조회"
  on public.customer_invitations
  for select
  using (status in ('pending', 'active') and expires_at > now());

create or replace function public.validate_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.customer_invitations%rowtype;
  designer_name text;
  normalized text;
begin
  normalized := upper(regexp_replace(trim(coalesce(p_code, '')), '[^A-HJ-NP-Z2-9]', '', 'g'));

  if length(normalized) <> 6 then
    return jsonb_build_object(
      'valid', false,
      'reason', 'invalid',
      'message', '코드가 올바르지 않아요'
    );
  end if;

  select * into inv
  from public.customer_invitations
  where invite_code = normalized;

  if not found then
    return jsonb_build_object(
      'valid', false,
      'reason', 'invalid',
      'message', '코드가 올바르지 않아요'
    );
  end if;

  if inv.status = 'used' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'used',
      'message', '이미 사용된 코드예요'
    );
  end if;

  if inv.status = 'expired' or inv.expires_at < now() then
    return jsonb_build_object(
      'valid', false,
      'reason', 'expired',
      'message', '코드가 만료되었어요. 디자이너에게 새 코드를 요청하세요'
    );
  end if;

  if inv.status not in ('pending', 'active') then
    return jsonb_build_object(
      'valid', false,
      'reason', 'invalid',
      'message', '코드가 올바르지 않아요'
    );
  end if;

  select coalesce(nullif(trim(name), ''), '디자이너')
  into designer_name
  from public.profiles
  where id = inv.designer_id;

  return jsonb_build_object(
    'valid', true,
    'designer_name', designer_name,
    'invitation', jsonb_build_object(
      'id', inv.id,
      'invite_code', inv.invite_code,
      'designer_id', inv.designer_id,
      'treatment_id', inv.treatment_id,
      'customer_name', inv.customer_name,
      'customer_phone', inv.customer_phone,
      'status', case when inv.status = 'active' then 'pending' else inv.status end,
      'expires_at', inv.expires_at,
      'used_at', inv.used_at,
      'used_by', inv.used_by,
      'created_at', inv.created_at
    )
  );
end;
$$;

grant execute on function public.validate_invite_code(text) to anon, authenticated;
