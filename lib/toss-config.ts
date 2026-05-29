const APP_SCHEME = 'hairdiaryapp';

export type TossPaymentParams = {
  amount: number;
  orderId: string;
  orderName: string;
  treatmentId: string;
};

export type TossPaymentSuccess = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type TossPaymentFailure = {
  code: string;
  message: string;
  orderId?: string;
};

export function getTossClientKey() {
  return process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? '';
}

export function isTossConfigured() {
  const key = getTossClientKey();
  return key.length > 0 && key !== '여기에_입력';
}

export function isTossTestKey() {
  return getTossClientKey().startsWith('test_');
}

export const TOSS_TEST_CARD = {
  cardNumber: '4330-1234-1234-1234',
  expiry: '12/30',
  cvc: '123',
  passwordPrefix: '00',
  birthDate: '940101',
} as const;

export function shouldShowTossTestCardGuide() {
  return isTossTestKey() || !isTossConfigured();
}

export function createTossOrderId(treatmentId: string) {
  return `hair-${treatmentId}-${Date.now()}`;
}

export function getPaymentRedirectUrls() {
  return {
    successUrl: `${APP_SCHEME}://payment/success`,
    failUrl: `${APP_SCHEME}://payment/fail`,
  };
}

export function parseTossSuccessUrl(url: string): TossPaymentSuccess | null {
  if (!url.includes('payment/success')) {
    return null;
  }

  try {
    const query = url.includes('?') ? url.split('?')[1] : '';
    const params = new URLSearchParams(query);

    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount') ?? '0');

    if (!paymentKey || !orderId) {
      return null;
    }

    return { paymentKey, orderId, amount };
  } catch {
    return null;
  }
}

export function parseTossFailUrl(url: string): TossPaymentFailure | null {
  if (!url.includes('payment/fail')) {
    return null;
  }

  try {
    const query = url.includes('?') ? url.split('?')[1] : '';
    const params = new URLSearchParams(query);

    return {
      code: params.get('code') ?? 'UNKNOWN',
      message: params.get('message') ?? '결제에 실패했습니다.',
      orderId: params.get('orderId') ?? undefined,
    };
  } catch {
    return null;
  }
}
