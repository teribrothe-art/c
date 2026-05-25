import { normalizePaymentStatus } from './payment-status';
import type { Treatment } from './treatments';

const SETTLEMENT_TEXT_FIELDS = ['technique', 'designer_diagnosis', 'home_care'] as const;

/** 정산·피드백에 필요한 텍스트 입력 (약품·사진은 선택) */
export function isDesignerSettlementInputComplete(treatment: Treatment | null | undefined) {
  if (!treatment) {
    return false;
  }

  return SETTLEMENT_TEXT_FIELDS.every((field) => Boolean(treatment[field]?.trim()));
}

export function canTreatmentSettle(
  treatment: Treatment | null | undefined,
  paymentRecordStatus?: string | null,
) {
  if (!treatment) {
    return false;
  }

  const paymentStatus = normalizePaymentStatus(treatment.payment_status);
  const isPaid =
    paymentRecordStatus === 'paid' ||
    paymentRecordStatus === 'in_escrow' ||
    paymentRecordStatus === 'completed' ||
    paymentStatus === 'escrow';

  return isPaid && isDesignerSettlementInputComplete(treatment);
}

export function getSettlementBlockReason(
  treatment: Treatment | null | undefined,
  paymentRecordStatus?: string | null,
) {
  if (!treatment) {
    return '시술 정보가 없습니다.';
  }

  const paymentStatus = normalizePaymentStatus(treatment.payment_status);

  if (paymentStatus !== 'escrow' && paymentStatus !== 'completed') {
    if (paymentStatus === 'payment_requested') {
      return '고객 결제를 기다리는 중이에요.';
    }

    return '고객 결제 후 정산할 수 있어요.';
  }

  if (!isDesignerSettlementInputComplete(treatment)) {
    return '기법·진단·홈케어 입력을 마쳐주세요.';
  }

  if (
    paymentRecordStatus &&
    paymentRecordStatus !== 'paid' &&
    paymentRecordStatus !== 'in_escrow' &&
    paymentRecordStatus !== 'completed'
  ) {
    return '결제 기록 확인 중이에요.';
  }

  return null;
}

/** 결제(에스크로) 후 필수 입력이 채워졌으면 feedback_completed 동기화 */
export function shouldSyncFeedbackCompleted(treatment: Treatment | null | undefined) {
  if (!treatment || treatment.feedback_completed) {
    return false;
  }

  const paymentStatus = normalizePaymentStatus(treatment.payment_status);

  return paymentStatus === 'escrow' && isDesignerSettlementInputComplete(treatment);
}
