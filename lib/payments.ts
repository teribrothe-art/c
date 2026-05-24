import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import {
  calculatePaymentFees,
  ensurePaymentRecordForTreatment,
  getPaymentByTreatmentId,
  markPaymentCompleted,
  markPaymentFailed,
  markPaymentPaid,
  PaymentRecord,
  PLATFORM_FEE_RATE,
  updatePaymentOrderId,
  upsertDemoPaymentOnRequest,
} from './payment-record';
import { normalizePaymentStatus } from './payment-status';
import { supabase } from './supabase';
import { createTossOrderId, isTossConfigured as isTossKeyConfigured } from './toss';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

export { PLATFORM_FEE_RATE };
export { ensurePaymentRecordForTreatment, getPaymentByTreatmentId } from './payment-record';
export { isTossConfigured } from './toss';

export function calculatePayout(amount: number) {
  const { feeAmount, designerPayout } = calculatePaymentFees(amount);

  return {
    platformFee: feeAmount,
    designerPayout,
  };
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

  const updatedTreatment = await updateTreatment(treatmentId, {
    payment_status: 'payment_requested',
    payment_requested_at: now,
    toss_order_id: orderId,
  });

  await upsertDemoPaymentOnRequest(updatedTreatment, orderId);

  return updatedTreatment;
}

/** 결제 버튼: pending 레코드 + toss_order_id */
export async function preparePaymentSession(treatmentId: string) {
  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  const orderId = createTossOrderId(treatmentId);
  await ensurePaymentRecordForTreatment(treatmentId);
  await updatePaymentOrderId(treatmentId, orderId);

  await updateTreatment(treatmentId, {
    toss_order_id: orderId,
  });

  return { treatment, orderId };
}

export async function handleTossPaymentSuccess(
  treatmentId: string,
  input: { paymentKey: string; orderId: string },
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  assertCustomerOwnership(treatment, user.id);

  const amount = treatment.price ?? 0;
  const { platformFee, designerPayout } = calculatePayout(amount);
  const now = new Date().toISOString();

  if (!isDemoAuthMode && supabase && isTossKeyConfigured()) {
    // TODO: Supabase Edge Function에서 paymentKey 승인 API 호출
  }

  await markPaymentPaid(treatmentId, {
    tossPaymentKey: input.paymentKey,
    tossOrderId: input.orderId,
  });

  return updateTreatment(treatmentId, {
    payment_status: 'escrow',
    paid_at: now,
    toss_payment_key: input.paymentKey,
    toss_order_id: input.orderId,
    platform_fee: platformFee,
    designer_payout_amount: designerPayout,
    feedback_completed: false,
  });
}

export async function handleTossPaymentFailure(treatmentId: string) {
  await markPaymentFailed(treatmentId);
}

export async function completeCustomerPayment(treatmentId: string, tossPaymentKey?: string) {
  const orderId = createTossOrderId(treatmentId);
  return handleTossPaymentSuccess(treatmentId, {
    paymentKey: tossPaymentKey ?? `demo-payment-${Date.now()}`,
    orderId,
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

  const payment = await getPaymentByTreatmentId(treatmentId);

  if (!payment || payment.status !== 'paid') {
    throw new Error('고객 결제 완료 후에만 정산할 수 있습니다.');
  }

  if (!treatment.feedback_completed) {
    throw new Error('피드백 입력을 완료한 뒤 정산할 수 있습니다.');
  }

  const now = new Date().toISOString();

  await markPaymentCompleted(treatmentId);

  return updateTreatment(treatmentId, {
    payment_status: 'completed',
    settled_at: now,
  });
}

export async function isTreatmentPaymentPaid(treatmentId: string) {
  const payment = await getPaymentByTreatmentId(treatmentId);
  return payment?.status === 'paid' || payment?.status === 'in_escrow' || payment?.status === 'completed';
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

export type { PaymentRecord };
