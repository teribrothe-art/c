-- 'DESIGNER_ID'를 실제 디자이너 profile id로 바꿔주세요.
update public.treatments
set
  designer_id = 'DESIGNER_ID',
  customer_name = '김지원',
  price = 150000,
  payment_status = 'completed',
  feedback_completed = true
where treatment_type in ('컷', '컬러');

-- 탈색은 정산 대기 상태로
update public.treatments
set
  designer_id = 'DESIGNER_ID',
  customer_name = '김지원',
  price = 250000,
  payment_status = 'feedback_required',
  feedback_completed = false
where treatment_type = '탈색';

-- 다른 고객 시술 하나 추가 (정산 대기)
insert into public.treatments (
  customer_id, designer_id, customer_name, designer_name,
  treatment_date, treatment_type, treatment_title, products,
  damage_level, duration, price, payment_status, feedback_completed
) values (
  'DESIGNER_ID', -- 임시로 디자이너 ID 사용 (테스트용)
  'DESIGNER_ID',
  '박민지',
  '디자이너',
  '2026-04-10',
  '펌',
  '매직스트레이트',
  array['로레알 펌제'],
  6,
  '4시간',
  180000,
  'feedback_required',
  false
);
