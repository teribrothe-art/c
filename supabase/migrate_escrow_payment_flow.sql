-- 에스크로 결제 플로우: Supabase SQL Editor에서 실행

alter table public.treatments drop constraint if exists treatments_payment_status_check;

alter table public.treatments
  add constraint treatments_payment_status_check
  check (
    payment_status in (
      'pending',
      'payment_requested',
      'escrow',
      'completed',
      'feedback_required'
    )
  );

alter table public.treatments
  add column if not exists payment_requested_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists toss_order_id text,
  add column if not exists toss_payment_key text,
  add column if not exists platform_fee integer,
  add column if not exists designer_payout_amount integer;

-- 기존 정산 대기 데이터는 고객 결제 완료(에스크로) 상태로 간주
update public.treatments
set payment_status = 'escrow'
where payment_status = 'feedback_required';
