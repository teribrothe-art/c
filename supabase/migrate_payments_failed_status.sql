-- payments.status에 failed 추가

alter table public.payments drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in ('pending', 'paid', 'in_escrow', 'completed', 'refunded', 'failed')
  );
