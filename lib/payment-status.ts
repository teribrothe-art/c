export type PaymentStatus =
  | 'pending'
  | 'payment_requested'
  | 'escrow'
  | 'completed'
  | 'feedback_required';

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
      return '에스크로 보관';
    case 'completed':
      return '정산 완료';
    default:
      return '결제 대기';
  }
}
