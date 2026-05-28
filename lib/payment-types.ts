export type PaymentRecordStatus =
  | 'pending'
  | 'paid'
  | 'in_escrow'
  | 'completed'
  | 'refunded';

export type PaymentRecord = {
  id: string;
  treatment_id: string;
  customer_id: string;
  designer_id: string;
  amount: number;
  fee_rate: number;
  fee_amount: number | null;
  designer_payout: number | null;
  status: PaymentRecordStatus;
  toss_payment_key: string | null;
  toss_order_id: string | null;
  paid_at: string | null;
  settled_at: string | null;
  created_at: string;
  receipt_url: string | null;
  refund_amount: number;
  refund_reason: string | null;
  refunded_at: string | null;
};
