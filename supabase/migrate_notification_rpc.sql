-- 다른 사용자에게 알림을 남길 때 (고객 가입·결제·시술 기록 등)
-- Supabase SQL Editor에서 migrate_notifications.sql 이후 실행

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
