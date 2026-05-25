-- Supabase SQL Editor에서 실행 (초대 코드 생성·연동)

grant execute on function public.generate_invite_code() to authenticated;

-- 기존 DB에 status가 active로 남은 초대 정리
update public.customer_invitations
set status = 'pending'
where status = 'active';

-- 트리거가 없으면 재생성 (schema.sql과 동일)
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
create trigger on_invitation_used
  after update on public.customer_invitations
  for each row
  execute function public.link_customer_to_designer();

-- 트리거 실패 시 앱에서 호출 (시술·관계 연결)
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
