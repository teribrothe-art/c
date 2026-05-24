import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { normalizePaymentStatus } from './payment-status';
import { supabase } from './supabase';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

export const PLATFORM_FEE_RATE = 0.1;

export const isTossConfigured = Boolean(
  process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY &&
    process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY !== '여기에_입력',
);

export function calculatePayout(amount: number) {
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
  const designerPayout = amount - platformFee;

  return {
    platformFee,
    designerPayout,
  };
}

export function createTossOrderId(treatmentId: string) {
  return `hair-${treatmentId}-${Date.now()}`;
}

function assertDesignerOwnership(treatment: Treatment, designerId: string) {
  if (treatment.designer_id !== designerId) {
    throw new Error('권한이 없습니다');
  }
}

function assertCustomerOwnership(treatment: Treatment, customerId: string) {
  if (isDemoAuthMode) {
    return;
  }

  if (treatment.customer_id !== customerId) {
    throw new Error('권한이 없습니다');
  }
}

export async function requestCustomerPayment(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 결제 요청을 보낼 수 있습니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  assertDesignerOwnership(treatment, user.id);

  const status = normalizePaymentStatus(treatment.payment_status);

  if (status !== 'pending') {
    throw new Error('이미 결제 요청이 진행된 시술입니다.');
  }

  if (!treatment.price || treatment.price <= 0) {
    throw new Error('결제 금액이 설정되지 않았습니다.');
  }

  const orderId = createTossOrderId(treatmentId);
  const now = new Date().toISOString();

  return updateTreatment(treatmentId, {
    payment_status: 'payment_requested',
    payment_requested_at: now,
    toss_order_id: orderId,
  });
}

export async function completeCustomerPayment(treatmentId: string, tossPaymentKey?: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  assertCustomerOwnership(treatment, user.id);

  const status = normalizePaymentStatus(treatment.payment_status);

  if (status !== 'payment_requested') {
    throw new Error('결제 요청된 시술만 결제할 수 있습니다.');
  }

  const amount = treatment.price ?? 0;

  if (amount <= 0) {
    throw new Error('결제 금액이 올바르지 않습니다.');
  }

  const { platformFee, designerPayout } = calculatePayout(amount);
  const now = new Date().toISOString();

  if (!isDemoAuthMode && supabase && isTossConfigured && tossPaymentKey) {
    // 실제 연동: Supabase Edge Function에서 paymentKey로 토스 승인 API 호출 후 escrow 전환
    // 여기서는 승인 완료된 paymentKey만 저장합니다.
  }

  return updateTreatment(treatmentId, {
    payment_status: 'escrow',
    paid_at: now,
    toss_payment_key: tossPaymentKey ?? `demo-payment-${Date.now()}`,
    platform_fee: platformFee,
    designer_payout_amount: designerPayout,
    feedback_completed: false,
  });
}

export async function settleDesignerPayout(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 정산할 수 있습니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  assertDesignerOwnership(treatment, user.id);

  const status = normalizePaymentStatus(treatment.payment_status);

  if (status !== 'escrow') {
    throw new Error('고객 결제(에스크로) 완료 후에만 정산할 수 있습니다.');
  }

  if (!treatment.feedback_completed) {
    throw new Error('피드백 입력을 완료한 뒤 정산할 수 있습니다.');
  }

  const now = new Date().toISOString();

  return updateTreatment(treatmentId, {
    payment_status: 'completed',
    settled_at: now,
  });
}

export async function getCustomerPendingPayments() {
  const user = await getCurrentUser();

  if (!user) {
    return [] as Treatment[];
  }

  if (isDemoAuthMode || !supabase) {
    const { getTreatments } = await import('./treatments');
    const { treatments } = await getTreatments();
    return treatments.filter((treatment) => {
      if (normalizePaymentStatus(treatment.payment_status) !== 'payment_requested') {
        return false;
      }

      if (isDemoAuthMode && user.role === 'customer') {
        return true;
      }

      return treatment.customer_id === user.id;
    });
  }

  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('customer_id', user.id)
    .eq('payment_status', 'payment_requested')
    .order('payment_requested_at', { ascending: false });

  if (error) {
    throw toAppError(error);
  }

  return (data ?? []) as Treatment[];
}
