import type { PaymentStatus } from './payment-status';

/** 시술 레코드 — treatments 모듈과 분리해 require cycle 방지 */
export type Treatment = {
  id: string;
  customer_id?: string | null;
  designer_id?: string | null;
  designer_name: string | null;
  customer_name?: string | null;
  treatment_date: string;
  treatment_type: string;
  treatment_title: string;
  products: string[] | null;
  technique?: string | null;
  damage_level: number | null;
  notes?: string | null;
  duration?: string | null;
  designer_diagnosis?: string | null;
  home_care?: string | null;
  ai_insight?: string | null;
  price?: number | null;
  payment_status?: PaymentStatus | null;
  feedback_completed?: boolean | null;
  payment_requested_at?: string | null;
  paid_at?: string | null;
  settled_at?: string | null;
  toss_order_id?: string | null;
  toss_payment_key?: string | null;
  platform_fee?: number | null;
  designer_payout_amount?: number | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  created_at?: string | null;
};
