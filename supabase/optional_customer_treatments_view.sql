-- (선택) 고객용 시술 조회 뷰 — products 등 디자이너 전용 컬럼 제외
-- treatments.products를 고객 SELECT에서 숨기려면 앱에서 이 뷰를 조회하세요.
-- 디자이너 앱은 기존 treatments 테이블을 그대로 사용합니다.

create or replace view public.customer_treatments_public as
select
  id,
  customer_id,
  designer_id,
  designer_name,
  customer_name,
  treatment_date,
  treatment_type,
  treatment_title,
  damage_level,
  duration,
  designer_diagnosis,
  home_care,
  ai_insight,
  price,
  payment_status,
  feedback_completed,
  created_at
from public.treatments;

comment on view public.customer_treatments_public is
  '고객 앱용: products, technique, notes 등 디자이너 전용 필드 제외';

-- 뷰에 대한 RLS는 기본 테이블 정책을 따르지 않으므로,
-- 고객 앱에서 이 뷰를 쓸 경우 별도 GRANT + security_invoker 설정이 필요할 수 있습니다.
-- Supabase에서는 security_invoker 뷰 + 동일한 auth.uid() = customer_id 정책을
-- treatments에 두고, 고객 클라이언트만 이 뷰를 select 하도록 구성하는 방식을 권장합니다.
