import {
  extractTreatmentIdFromOrderId,
  parseTossFailUrl,
  parseTossSuccessUrl,
  type TossPaymentFailure,
  type TossPaymentSuccess,
} from './toss';

export type PaymentReturnParams = {
  treatmentId?: string;
  success?: TossPaymentSuccess;
  failure?: TossPaymentFailure;
};

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/** expo-router 검색 파라미터 또는 딥링크 URL에서 결제 결과 파싱 */
type SearchParamValue = string | string[] | undefined;

export function parsePaymentReturnFromSearchParams(
  params: Record<string, SearchParamValue>,
): PaymentReturnParams {
  const paymentKey = normalizeParam(params.paymentKey);
  const orderId = normalizeParam(params.orderId);
  const tid = normalizeParam(params.tid);
  const code = normalizeParam(params.code);
  const message = normalizeParam(params.message);

  const treatmentId =
    tid?.trim() ||
    (orderId ? extractTreatmentIdFromOrderId(orderId) ?? undefined : undefined);

  if (paymentKey && orderId) {
    return {
      treatmentId,
      success: {
        paymentKey,
        orderId,
        amount: Number(normalizeParam(params.amount) ?? '0'),
        treatmentId,
      },
    };
  }

  if (code || message) {
    return {
      treatmentId,
      failure: {
        code: code ?? 'UNKNOWN',
        message: message ?? '결제에 실패했습니다.',
        orderId: orderId ?? undefined,
      },
    };
  }

  return { treatmentId };
}

export function parsePaymentReturnFromUrl(url: string): PaymentReturnParams {
  const success = parseTossSuccessUrl(url);

  if (success) {
    return {
      treatmentId: success.treatmentId,
      success,
    };
  }

  const failure = parseTossFailUrl(url);

  if (failure) {
    const treatmentId = failure.orderId
      ? extractTreatmentIdFromOrderId(failure.orderId) ?? undefined
      : undefined;

    return { treatmentId, failure };
  }

  return {};
}
