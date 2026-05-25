-- 기존(active) 스키마 → pending 스키마 정렬 (이미 migrate_customer_invitations.sql 실행한 DB용)

update public.customer_invitations
set status = 'pending'
where status = 'active';

alter table public.customer_invitations
  drop constraint if exists customer_invitations_status_check;

alter table public.customer_invitations
  add constraint customer_invitations_status_check
  check (status in ('pending', 'used', 'expired'));

alter table public.customer_invitations
  alter column status set default 'pending';

alter table public.treatments
  alter column customer_id drop not null;

alter table public.customer_invitations
  drop constraint if exists customer_invitations_treatment_id_fkey;

alter table public.customer_invitations
  alter column treatment_id drop not null;

alter table public.customer_invitations
  add constraint customer_invitations_treatment_id_fkey
  foreign key (treatment_id) references public.treatments(id) on delete set null;

alter table public.designer_customer_relationships
  drop column if exists invitation_id;

alter table public.designer_customer_relationships
  add column if not exists first_treatment_date date,
  add column if not exists total_treatments integer default 0,
  add column if not exists total_amount integer default 0,
  add column if not exists status text default 'active';

drop policy if exists "디자이너 초대 관리" on public.customer_invitations;
drop policy if exists "고객 초대 코드 검증" on public.customer_invitations;
drop policy if exists "초대 코드 조회" on public.customer_invitations;
drop policy if exists "디자이너 초대 코드 관리" on public.customer_invitations;

create policy "디자이너 초대 코드 관리"
  on public.customer_invitations
  for all
  using (auth.uid() = designer_id);

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

drop trigger if exists trg_customer_invitation_used on public.customer_invitations;
drop trigger if exists on_invitation_used on public.customer_invitations;

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

create trigger on_invitation_used
  after update on public.customer_invitations
  for each row
  execute function public.link_customer_to_designer();
