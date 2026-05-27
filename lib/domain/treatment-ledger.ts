import { getCustomerPaymentBadge, normalizePaymentStatus, type PaymentStatus } from '../payment-status';
import type { PaymentRecord } from '../payment-types';
import type { Treatment } from '../treatments';

/**
 * 시술(treatments) + 결제(payments)를 하나의 화면·통계 단위로 묶은 도메인 모델.
 * 모든 고객/디자이너 이력·정산·매출 화면은 이 레코드를 기준으로 파생합니다.
 */
export type TreatmentLedgerEntry = {
  treatment: Treatment;
  payment: PaymentRecord | null;
  /** treatments.payment_status 와 payments.status 를 통합한 단일 상태 */
  paymentStatus: PaymentStatus;
  badge: ReturnType<typeof getCustomerPaymentBadge>;
};

export function indexPaymentsByTreatmentId(payments: PaymentRecord[]) {
  return new Map(payments.map((payment) => [payment.treatment_id, payment]));
}

export function buildTreatmentLedgerEntries(
  treatments: Treatment[],
  paymentsByTreatmentId: Map<string, PaymentRecord>,
): TreatmentLedgerEntry[] {
  return treatments.map((treatment) => {
    const payment = paymentsByTreatmentId.get(treatment.id) ?? null;
    let paymentStatus = normalizePaymentStatus(treatment.payment_status);

    if (payment?.status === 'completed') {
      paymentStatus = 'completed';
    } else if (payment?.status === 'paid' || payment?.status === 'in_escrow') {
      paymentStatus = 'escrow';
    }

    return {
      treatment,
      payment,
      paymentStatus,
      badge: getCustomerPaymentBadge(treatment.payment_status, payment?.status ?? null, {
        settledAt: payment?.settled_at ?? treatment.settled_at,
      }),
    };
  });
}

/** 정산·대기 집계 시 기준일 (시술일 우선) */
export function ledgerTreatmentDate(entry: TreatmentLedgerEntry) {
  return entry.treatment.treatment_date;
}

export function monthKeyFromLedgerDate(date: string) {
  return date.slice(0, 7);
}

export function isLedgerAwaitingSettlement(entry: TreatmentLedgerEntry) {
  return (
    entry.payment?.status === 'paid' ||
    entry.payment?.status === 'in_escrow' ||
    entry.paymentStatus === 'escrow'
  );
}

export function isLedgerSettled(entry: TreatmentLedgerEntry) {
  return entry.payment?.status === 'completed' || entry.paymentStatus === 'completed';
}
