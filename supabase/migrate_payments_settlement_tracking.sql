-- 정산 내역 상세 추적 + 디자이너 정산 통계 뷰 (Supabase SQL Editor에서 실행)

alter table public.payments
  add column if not exists receipt_url text,
  add column if not exists refund_amount integer default 0,
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;

create or replace view public.designer_revenue
with (security_invoker = true) as
select
  designer_id,
  date_trunc('month', settled_at) as month,
  count(*) as treatment_count,
  sum(amount) as gross_revenue,
  sum(fee_amount) as total_fees,
  sum(designer_payout) as net_payout
from public.payments
where status = 'completed'
  and settled_at is not null
group by designer_id, date_trunc('month', settled_at);

grant select on public.designer_revenue to authenticated;
