-- 기존 DB에 적용: Supabase SQL Editor에서 실행
-- treatment-photos 버킷 + Storage RLS + treatments 사진 URL 컬럼

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

alter table public.treatments
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text;
