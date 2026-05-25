import type { PaymentRecordStatus } from './payment-record';

export type PaymentStatus =
  | 'pending'
  | 'payment_requested'
  | 'escrow'
  | 'completed'
  | 'feedback_required';

export type CustomerPaymentBadge = {
  label: string;
  variant: 'pending' | 'settlement' | 'done';
};

export function normalizePaymentStatus(status?: string | null): PaymentStatus {
  if (status === 'feedback_required') {
    return 'escrow';
  }

  if (
    status === 'pending' ||
    status === 'payment_requested' ||
    status === 'escrow' ||
    status === 'completed'
  ) {
    return status;
  }

  return 'pending';
}

export function getPaymentStatusLabel(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case 'pending':
      return '결제 대기';
    case 'payment_requested':
      return '결제 요청됨';
    case 'escrow':
      return '정산 대기';
    case 'completed':
      return '완료';
    default:
      return '결제 대기';
  }
}

export function getCustomerPaymentBadge(
  treatmentStatus?: string | null,
  paymentStatus?: PaymentRecordStatus | null,
  options?: { settledAt?: string | null },
): CustomerPaymentBadge {
  const treatment = normalizePaymentStatus(treatmentStatus);

  if (options?.settledAt || treatment === 'completed' || paymentStatus === 'completed') {
    return { label: '완료', variant: 'done' };
  }

  if (
    paymentStatus === 'paid' ||
    paymentStatus === 'in_escrow' ||
    treatment === 'escrow'
  ) {
    return { label: '정산 대기', variant: 'settlement' };
  }

  if (treatment === 'payment_requested') {
    return { label: '결제 요청', variant: 'pending' };
  }

  return { label: '결제 대기', variant: 'pending' };
}
