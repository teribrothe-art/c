import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { getTreatmentById, Treatment } from './treatments';

/** DB `payments.fee_rate` 기본값(0.04)과 동일 */
export const PLATFORM_FEE_RATE = 0.04;

export type PaymentRecordStatus =
  | 'pending'
  | 'paid'
  | 'in_escrow'
  | 'completed'
  | 'refunded'
  | 'failed';

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
};

const paymentSelectFields =
  'id, treatment_id, customer_id, designer_id, amount, fee_rate, fee_amount, designer_payout, status, toss_payment_key, toss_order_id, paid_at, settled_at, created_at';

const demoPayments: PaymentRecord[] = [];

function requireTreatmentParties(treatment: Treatment) {
  if (!treatment.customer_id || !treatment.designer_id) {
    throw new Error('시술에 고객·디자이너 정보가 없습니다.');
  }

  return {
    customerId: treatment.customer_id,
    designerId: treatment.designer_id,
  };
}

export function calculatePaymentFees(amount: number, feeRate = PLATFORM_FEE_RATE) {
  const feeAmount = Math.round(amount * feeRate);
  const designerPayout = amount - feeAmount;

  return {
    feeRate,
    feeAmount,
    designerPayout,
  };
}

export async function getPaymentByTreatmentId(treatmentId: string) {
  if (isDemoAuthMode || !supabase) {
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

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  const { customerId, designerId } = requireTreatmentParties(treatment);
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
    };

    demoPayments.push(record);
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

  const { customerId, designerId } = requireTreatmentParties(treatment);
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
  };

  if (existingIndex >= 0) {
    demoPayments[existingIndex] = record;
  } else {
    demoPayments.push(record);
  }
}


export async function updatePaymentOrderId(treatmentId: string, tossOrderId: string) {
  if (isDemoAuthMode || !supabase) {
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    if (index >= 0) {
      demoPayments[index] = { ...demoPayments[index], toss_order_id: tossOrderId, status: 'pending' };
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
  input: { tossPaymentKey: string; tossOrderId?: string | null },
) {
  const amount = (await getTreatmentById(treatmentId)).treatment?.price ?? 0;
  const { feeRate, feeAmount, designerPayout } = calculatePaymentFees(amount);
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    if (index < 0) {
      await ensurePaymentRecordForTreatment(treatmentId);
      return markPaymentPaid(treatmentId, input);
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
    };
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
    })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}

export async function markPaymentFailed(treatmentId: string) {
  if (isDemoAuthMode || !supabase) {
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);
    if (index < 0) {
      return null;
    }
    demoPayments[index] = { ...demoPayments[index], status: 'failed' };
    return demoPayments[index];
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'failed' })
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

export async function markPaymentCompleted(treatmentId: string) {
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    const index = demoPayments.findIndex((payment) => payment.treatment_id === treatmentId);

    if (index < 0) {
      return null;
    }

    demoPayments[index] = {
      ...demoPayments[index],
      status: 'completed',
      settled_at: now,
    };

    return demoPayments[index];
  }

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      settled_at: now,
    })
    .eq('treatment_id', treatmentId)
    .select(paymentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as PaymentRecord;
}
