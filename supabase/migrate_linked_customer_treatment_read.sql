-- 담당(활성) 디자이너가 연결 고객의 전체 시술 이력을 조회할 수 있도록 SELECT 정책 추가
-- 진단·홈케어 등 비공개 필드는 앱에서 마스킹합니다.

drop policy if exists "담당 디자이너는 연결 고객 시술 조회" on public.treatments;

create policy "담당 디자이너는 연결 고객 시술 조회"
  on public.treatments
  for select
  using (
    exists (
      select 1
      from public.designer_customer_relationships r
      where r.designer_id = auth.uid()
        and r.customer_id = treatments.customer_id
        and r.status = 'active'
    )
  );
