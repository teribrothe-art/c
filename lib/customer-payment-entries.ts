import { getCurrentUser } from './auth';
import { getPaymentByTreatmentId, PaymentRecord } from './payment-record';
import { normalizePaymentStatus } from './payment-status';
import { getTreatments, Treatment } from './treatments';

export type CustomerPaymentEntry = {
  treatment: Treatment;
  payment: PaymentRecord | null;
  statusLabel: string;
  statusTone: 'pending' | 'paid' | 'done';
  amount: number;
  canPay: boolean;
  canViewReceipt: boolean;
  receiptPaymentId: string | null;
  sortDate: string;
};

function buildEntry(treatment: Treatment, payment: PaymentRecord | null): CustomerPaymentEntry | null {
  const paymentStatus = normalizePaymentStatus(treatment.payment_status);

  if (
    paymentStatus !== 'payment_requested' &&
    paymentStatus !== 'escrow' &&
    paymentStatus !== 'completed'
  ) {
    return null;
  }

  const amount = treatment.price ?? payment?.amount ?? 0;
  const canPay = paymentStatus === 'payment_requested' && amount > 0;
  const canViewReceipt = Boolean(
    payment &&
      (payment.status === 'paid' ||
        payment.status === 'in_escrow' ||
        payment.status === 'completed'),
  );

  let statusLabel = '결제 대기';
  let statusTone: CustomerPaymentEntry['statusTone'] = 'pending';

  if (paymentStatus === 'completed' || payment?.status === 'completed') {
    statusLabel = '결제·정산 완료';
    statusTone = 'done';
  } else if (paymentStatus === 'escrow' || payment?.status === 'paid' || payment?.status === 'in_escrow') {
    statusLabel = '결제 완료';
    statusTone = 'paid';
  } else if (paymentStatus === 'payment_requested') {
    statusLabel = '결제 필요';
    statusTone = 'pending';
  }

  const sortDate =
    payment?.paid_at ??
    treatment.payment_requested_at ??
    treatment.paid_at ??
    treatment.treatment_date ??
    payment?.created_at ??
    '';

  return {
    treatment,
    payment,
    statusLabel,
    statusTone,
    amount,
    canPay,
    canViewReceipt,
    receiptPaymentId: canViewReceipt ? payment?.id ?? null : null,
    sortDate,
  };
}

/** 고객 시술별 결제·영수증 항목 (중복 시술 포함 전체 목록) */
export async function fetchCustomerPaymentEntries(): Promise<CustomerPaymentEntry[]> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    return [];
  }

  const { treatments } = await getTreatments();
  const entries: CustomerPaymentEntry[] = [];

  for (const treatment of treatments) {
    const payment = await getPaymentByTreatmentId(treatment.id);
    const entry = buildEntry(treatment, payment);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

export async function fetchCustomerPendingPaymentEntries(): Promise<CustomerPaymentEntry[]> {
  const entries = await fetchCustomerPaymentEntries();
  return entries.filter((entry) => entry.canPay);
}
