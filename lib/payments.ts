import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import {
  notifyDesignerPaymentCompleted,
  notifyDesignerPaymentRequested,
  notifyDesignerSettlementCompleted,
} from './notifications';
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
import { withRetry } from './payment-retry';
import { normalizePaymentStatus } from './payment-status';
import { supabase } from './supabase';
import { resolveTreatmentCustomerForPayment } from './payment-customer';
import { isLocalPaymentSimulation } from './payment-config';
import { createTossOrderId } from './toss';
import { isDesignerSettlementInputComplete } from './treatment-settlement';
import { invalidateDesignerLedgerCache } from './services/ledger-cache';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

function invalidateLedgerForTreatment(treatment: Treatment) {
  if (treatment.designer_id) {
    invalidateDesignerLedgerCache(treatment.designer_id);
  }
}

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

/** 토스 영수증 URL (테스트/운영 공통 패턴) */
export function buildTossReceiptUrl(paymentKey: string) {
  return `https://dashboard.tosspayments.com/receipt/payment/${paymentKey}`;
}

function assertDesignerOwnership(treatment: Treatment, designerId: string) {
  if (treatment.designer_id !== designerId) {
    throw new Error('권한이 없습니다');
  }
}

function assertCustomerOwnership(treatment: Treatment, customerId: string) {
  if (treatment.customer_id && treatment.customer_id !== customerId) {
    if (isDemoAuthMode || isLocalPaymentSimulation()) {
      return;
    }

    throw new Error('이 시술은 다른 고객 계정에 연결되어 있어요.');
  }
}

/** 결제 서버 없이 테스트 — 버튼 한 번으로 결제·에스크로까지 반영 */
export async function completeLocalTestPayment(treatmentId: string, orderId?: string) {
  const resolvedOrderId = orderId ?? createTossOrderId(treatmentId);

  return handleTossPaymentSuccess(treatmentId, {
    paymentKey: `local_test_${Date.now()}`,
    orderId: resolvedOrderId,
  });
}

export async function assertCanPayTreatment(treatmentId: string) {
  const payment = await getPaymentByTreatmentId(treatmentId);

  if (
    payment?.status === 'paid' ||
    payment?.status === 'completed' ||
    payment?.status === 'in_escrow'
  ) {
    throw new Error('이미 결제가 완료된 시술입니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (treatment && normalizePaymentStatus(treatment.payment_status) === 'escrow') {
    throw new Error('이미 결제가 완료된 시술입니다.');
  }

  if (treatment && normalizePaymentStatus(treatment.payment_status) === 'completed') {
    throw new Error('이미 정산이 완료된 시술입니다.');
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

  if (!treatment.customer_id) {
    throw new Error(
      '고객이 아직 앱에 연결되지 않았어요. 초대 코드로 가입을 완료한 뒤 결제 요청을 보내주세요.',
    );
  }

  const orderId = createTossOrderId(treatmentId);
  const now = new Date().toISOString();

  const updatedTreatment = await updateTreatment(treatmentId, {
    payment_status: 'payment_requested',
    payment_requested_at: now,
    toss_order_id: orderId,
  });

  await upsertDemoPaymentOnRequest(updatedTreatment, orderId);
  await notifyDesignerPaymentRequested(updatedTreatment);

  return updatedTreatment;
}

export async function preparePaymentSession(treatmentId: string) {
  await assertCanPayTreatment(treatmentId);

  const treatment = await resolveTreatmentCustomerForPayment(treatmentId);
  const orderId = createTossOrderId(treatmentId);

  await withRetry(() => ensurePaymentRecordForTreatment(treatmentId), { maxAttempts: 3 });
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

  await assertCanPayTreatment(treatmentId);

  const treatment = await resolveTreatmentCustomerForPayment(treatmentId);

  assertCustomerOwnership(treatment, user.id);

  const amount = treatment.price ?? 0;
  const { platformFee, designerPayout } = calculatePayout(amount);
  const now = new Date().toISOString();
  const receiptUrl = isLocalPaymentSimulation()
    ? null
    : buildTossReceiptUrl(input.paymentKey);

  try {
    await withRetry(() => ensurePaymentRecordForTreatment(treatmentId), { maxAttempts: 3 });

    await withRetry(
      async () => {
        await markPaymentPaid(treatmentId, {
          tossPaymentKey: input.paymentKey,
          tossOrderId: input.orderId,
          receiptUrl,
        });
      },
      { maxAttempts: 3 },
    );

    const updatedTreatment = await withRetry(
      () =>
        updateTreatment(treatmentId, {
          payment_status: 'escrow',
          paid_at: now,
          toss_payment_key: input.paymentKey,
          toss_order_id: input.orderId,
          platform_fee: platformFee,
          designer_payout_amount: designerPayout,
          feedback_completed: false,
        }),
      { maxAttempts: 3 },
    );

    const payment = await getPaymentByTreatmentId(treatmentId);

    if (payment) {
      await notifyDesignerPaymentCompleted(updatedTreatment, payment).catch(() => undefined);
    }

    invalidateLedgerForTreatment(updatedTreatment);

    return updatedTreatment;
  } catch (error) {
    await markPaymentFailed(treatmentId).catch(() => undefined);
    throw error;
  }
}

export async function handleTossPaymentFailure(treatmentId: string) {
  await markPaymentFailed(treatmentId);
}

export async function completeCustomerPayment(treatmentId: string, tossPaymentKey?: string) {
  if (isLocalPaymentSimulation()) {
    return completeLocalTestPayment(treatmentId);
  }

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

  let { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  assertDesignerOwnership(treatment, user.id);

  let payment = await getPaymentByTreatmentId(treatmentId);

  if (!payment) {
    throw new Error('고객 결제 완료 후에만 정산할 수 있습니다.');
  }

  if (payment.status !== 'paid' && payment.status !== 'in_escrow') {
    throw new Error('고객 결제 완료 후에만 정산할 수 있습니다.');
  }

  if (isDesignerSettlementInputComplete(treatment) && !treatment.feedback_completed) {
    await updateTreatment(treatmentId, { feedback_completed: true });
    const refreshed = await getTreatmentById(treatmentId);
    treatment = refreshed.treatment ?? treatment;
  }

  if (!isDesignerSettlementInputComplete(treatment)) {
    throw new Error('기법·진단·홈케어 입력을 완료한 뒤 정산할 수 있습니다.');
  }

  const now = new Date().toISOString();

  const completedPayment = await markPaymentCompleted(treatmentId, {
    receiptUrl: payment.receipt_url,
  });

  const settledPayment = (await getPaymentByTreatmentId(treatmentId)) ?? completedPayment ?? payment;
  const payoutAmount =
    settledPayment.designer_payout ??
    calculatePayout(treatment.price ?? settledPayment.amount ?? 0).designerPayout;
  const platformFee =
    settledPayment.fee_amount ??
    calculatePayout(treatment.price ?? settledPayment.amount ?? 0).platformFee;

  const updatedTreatment = await updateTreatment(treatmentId, {
    payment_status: 'completed',
    settled_at: now,
    feedback_completed: true,
    platform_fee: platformFee,
    designer_payout_amount: payoutAmount,
  });

  const paymentForNotify = settledPayment;

  await notifyDesignerSettlementCompleted(updatedTreatment, paymentForNotify);

  invalidateLedgerForTreatment(updatedTreatment);

  return updatedTreatment;
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
