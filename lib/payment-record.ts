import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import {
  mergeAccumulatedPaymentsIntoStore,
  shouldHydrateAccumulatedDemoDataForUser,
  stripAccumulatedPaymentsFromStore,
} from './demo-accumulated-demo-hydrate';
import { toAppError } from './errors';
import { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-fees';
import { getPaymentPartyIds, resolveTreatmentCustomerForPayment } from './payment-customer';
import type { PaymentRecord, PaymentRecordStatus } from './payment-types';
import { supabase } from './supabase';
import { getTreatmentById, Treatment } from './treatments';

export { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-fees';
export type { PaymentRecord, PaymentRecordStatus } from './payment-types';

const paymentSelectFields =
  'id, treatment_id, customer_id, designer_id, amount, fee_rate, fee_amount, designer_payout, status, toss_payment_key, toss_order_id, paid_at, settled_at, created_at, receipt_url, refund_amount, refund_reason, refunded_at';

const DEMO_PAYMENTS_KEY = 'hair-diary-demo-payments';

const INITIAL_DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: 'demo-payment-demo-treatment-4',
    treatment_id: 'demo-treatment-4',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    amount: 180000,
    fee_rate: 0.04,
    fee_amount: 7200,
    designer_payout: 172800,
    status: 'paid',
    toss_payment_key: 'demo_key_4',
    toss_order_id: 'hair-demo-treatment-4',
    paid_at: '2026-04-20T10:00:00.000Z',
    settled_at: null,
    created_at: '2026-04-20T09:00:00.000Z',
    receipt_url: 'https://dashboard.tosspayments.com/receipt/payment/demo_key_4',
    refund_amount: 0,
    refund_reason: null,
    refunded_at: null,
  },
];

const ALL_DEMO_PAYMENT_SEEDS: PaymentRecord[] = [...(INITIAL_DEMO_PAYMENTS ?? [])];

const demoPayments: PaymentRecord[] = INITIAL_DEMO_PAYMENTS.map((item) => ({ ...item }));

let demoPaymentsHydratePromise: Promise<void> | null = null;

async function ensureAccumulatedDemoPaymentsForCurrentUser() {
  const user = await getCurrentUser();

  if (!shouldHydrateAccumulatedDemoDataForUser(user)) {
    return;
  }

  if (mergeAccumulatedPaymentsIntoStore(demoPayments)) {
    await persistDemoPayments();
  }
}

async function prepareDemoPayments() {
  await hydrateDemoPayments();
  await ensureAccumulatedDemoPaymentsForCurrentUser();
}

async function hydrateDemoPayments() {
  if (!isDemoAuthMode) {
    return;
  }

  if (!demoPaymentsHydratePromise) {
    demoPaymentsHydratePromise = (async () => {
      const raw = await AsyncStorage.getItem(DEMO_PAYMENTS_KEY);

      if (raw) {
        const stored = JSON.parse(raw) as PaymentRecord[];
        demoPayments.length = 0;
        demoPayments.push(...stored);
      } else {
        demoPayments.length = 0;
        demoPayments.push(...ALL_DEMO_PAYMENT_SEEDS.map((item) => ({ ...item })));
      }

      let merged = false;

      const withoutStaleAccumulated = stripAccumulatedPaymentsFromStore(demoPayments);

      if (withoutStaleAccumulated.length !== demoPayments.length) {
        demoPayments.length = 0;
        demoPayments.push(...withoutStaleAccumulated);
        merged = true;
      }

      for (const seed of ALL_DEMO_PAYMENT_SEEDS) {
        if (!demoPayments.some((payment) => payment.id === seed.id)) {
          demoPayments.push({ ...seed });
          merged = true;
        }
      }

      if (!raw || merged) {
        await AsyncStorage.setItem(DEMO_PAYMENTS_KEY, JSON.stringify(demoPayments));
      }
    })();
  }

  await demoPaymentsHydratePromise;
}

async function persistDemoPayments() {
  if (!isDemoAuthMode) {
    return;
  }

  await AsyncStorage.setItem(DEMO_PAYMENTS_KEY, JSON.stringify(demoPayments));
}

function withSettledFees(payment: PaymentRecord) {
  const { feeRate, feeAmount, designerPayout } = calculatePaymentFees(
    payment.amount,
    payment.fee_rate ?? PLATFORM_FEE_RATE,
  );

  return {
    fee_rate: payment.fee_rate ?? feeRate,
    fee_amount: payment.fee_amount ?? feeAmount,
    designer_payout: payment.designer_payout ?? designerPayout,
  };
}


function requireTreatmentParties(treatment: Treatment, customerId: string) {
  return getPaymentPartyIds(treatment, customerId);
}

export async function getPaymentByTreatmentId(treatmentId: string) {
  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    return demoPayments.find((payment) => payment.treatment_id === treatmentId) ?? null;
  }

  const { data, error } = await supabase
    .from('payments')
    .select(paymentSelectFields)
    .eq('treatment_id', treatmentId)
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  return (data as PaymentRecord | null) ?? null;
}

/** 고객 결제 화면 진입 시 RLS(INSERT)에 맞춰 결제 행을 생성합니다. */
export async function ensurePaymentRecordForTreatment(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    throw new Error('고객만 결제 내역을 생성할 수 있습니다.');
  }

  const treatment = await resolveTreatmentCustomerForPayment(treatmentId);
  const { customerId, designerId } = requireTreatmentParties(treatment, treatment.customer_id!);
  const amount = treatment.price ?? 0;

  if (amount <= 0) {
    throw new Error('결제 금액이 설정되지 않았습니다.');
  }

  const existing = await getPaymentByTreatmentId(treatmentId);

  if (existing) {
    return existing;
  }

  const { feeRate } = calculatePaymentFees(amount);
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    const record: PaymentRecord = {
      id: `demo-payment-${treatmentId}`,
      treatment_id: treatmentId,
      customer_id: customerId,
      designer_id: designerId,
      amount,
      fee_rate: feeRate,
      fee_amount: null,
      designer_payout: null,
      status: 'pending',
      toss_payment_key: null,
      toss_order_id: treatment.toss_order_id ?? null,
      paid_at: null,
      settled_at: null,
      created_at: now,
      receipt_url: null,
      refund_amount: 0,
      refund_reason: null,
      refunded_at: null,
    };

    demoPayments.push(record);
    await persistDemoPayments();
    return record;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      treatment_id: treatmentId,
      customer_id: customerId,
      designer_id: designerId,
      amount,
      fee_rate: feeRate,
      toss_order_id: treatment.toss_order_id ?? null,
      status: 'pending',
    })
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}

export async function upsertDemoPaymentOnRequest(treatment: Treatment, tossOrderId: string) {
  if (!isDemoAuthMode) {
    return;
  }

  await prepareDemoPayments();

  const customerId = treatment.customer_id;

  if (!customerId || !treatment.designer_id) {
    throw new Error('시술에 고객·디자이너 정보가 없습니다.');
  }

  const designerId = treatment.designer_id;
  const amount = treatment.price ?? 0;
  const { feeRate } = calculatePaymentFees(amount);
  const now = new Date().toISOString();
  const existingIndex = demoPayments.findIndex((payment) => payment.treatment_id === treatment.id);

  const record: PaymentRecord = {
    id: existingIndex >= 0 ? demoPayments[existingIndex].id : `demo-payment-${treatment.id}`,
    treatment_id: treatment.id,
    customer_id: customerId,
    designer_id: designerId,
    amount,
    fee_rate: feeRate,
    fee_amount: null,
    designer_payout: null,
    status: 'pending',
    toss_payment_key: null,
    toss_order_id: tossOrderId,
    paid_at: null,
    settled_at: null,
    created_at: existingIndex >= 0 ? demoPayments[existingIndex].created_at : now,
    receipt_url: null,
    refund_amount: 0,
    refund_reason: null,
    refunded_at: null,
  };

  if (existingIndex >= 0) {
    demoPayments[existingIndex] = record;
  } else {
    demoPayments.push(record);
  }

  await persistDemoPayments();
}


export async function updatePaymentOrderId(treatmentId: string, tossOrderId: string) {
  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    let index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);

    if (index < 0) {
      await ensurePaymentRecordForTreatment(treatmentId);
      index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    }

    if (index >= 0) {
      demoPayments[index] = { ...demoPayments[index], toss_order_id: tossOrderId, status: 'pending' };
      await persistDemoPayments();
      return demoPayments[index];
    }

    return null;
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ toss_order_id: tossOrderId, status: 'pending' })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}

export async function markPaymentPaid(
  treatmentId: string,
  input: { tossPaymentKey: string; tossOrderId?: string | null; receiptUrl?: string | null },
) {
  const amount = (await getTreatmentById(treatmentId)).treatment?.price ?? 0;
  const { feeRate, feeAmount, designerPayout } = calculatePaymentFees(amount);
  const now = new Date().toISOString();

  await ensurePaymentRecordForTreatment(treatmentId);

  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);

    if (index < 0) {
      throw new Error('결제 내역을 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    demoPayments[index] = {
      ...demoPayments[index],
      status: 'paid',
      fee_rate: feeRate,
      fee_amount: feeAmount,
      designer_payout: designerPayout,
      toss_payment_key: input.tossPaymentKey,
      toss_order_id: input.tossOrderId ?? demoPayments[index].toss_order_id,
      paid_at: now,
      receipt_url: input.receiptUrl ?? demoPayments[index].receipt_url,
    };
    await persistDemoPayments();
    return demoPayments[index];
  }

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      fee_rate: feeRate,
      fee_amount: feeAmount,
      designer_payout: designerPayout,
      toss_payment_key: input.tossPaymentKey,
      toss_order_id: input.tossOrderId,
      paid_at: now,
      ...(input.receiptUrl ? { receipt_url: input.receiptUrl } : {}),
    })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}

/** 결제 실패 시 pending으로 되돌립니다 (스키마에 failed 없음) */
export async function markPaymentFailed(treatmentId: string) {
  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    if (index < 0) {
      return null;
    }
    demoPayments[index] = {
      ...demoPayments[index],
      status: 'pending',
      toss_payment_key: null,
      paid_at: null,
    };
    await persistDemoPayments();
    return demoPayments[index];
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'pending', toss_payment_key: null, paid_at: null })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}

export async function markPaymentInEscrow(
  treatmentId: string,
  input: { tossPaymentKey: string; tossOrderId?: string | null },
) {
  return markPaymentPaid(treatmentId, input);
}

export async function markPaymentCompleted(
  treatmentId: string,
  options?: { receiptUrl?: string | null },
) {
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);

    if (index < 0) {
      return null;
    }

    const current = demoPayments[index];
    const fees = withSettledFees(current);

    demoPayments[index] = {
      ...current,
      ...fees,
      status: 'completed',
      settled_at: now,
      receipt_url: options?.receiptUrl ?? current.receipt_url,
    };

    await persistDemoPayments();
    return demoPayments[index];
  }

  const amount = (await getTreatmentById(treatmentId)).treatment?.price ?? 0;
  const fees = calculatePaymentFees(amount);

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      settled_at: now,
      fee_amount: fees.feeAmount,
      designer_payout: fees.designerPayout,
      ...(options?.receiptUrl ? { receipt_url: options.receiptUrl } : {}),
    })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}


export async function recordPaymentRefund(
  treatmentId: string,
  input: { refundAmount: number; refundReason: string },
) {
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    await prepareDemoPayments();
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    if (index < 0) {
      return null;
    }
    demoPayments[index] = {
      ...demoPayments[index],
      status: 'refunded',
      refund_amount: input.refundAmount,
      refund_reason: input.refundReason,
      refunded_at: now,
    };
    await persistDemoPayments();
    return demoPayments[index];
  }

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refund_amount: input.refundAmount,
      refund_reason: input.refundReason,
      refunded_at: now,
    })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}
