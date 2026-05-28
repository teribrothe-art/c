import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isDemoAuthMode } from './auth';
import { isLocalPaymentSimulation } from './payment-config';

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
  treatmentId?: string;
};

export type TossPaymentFailure = {
  code: string;
  message: string;
  orderId?: string;
};

/** 앱용 클라이언트 키 (`test_ck_` / `live_ck_`). 시크릿 키(`test_sk_`)는 사용하지 않습니다. */
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

/** 토스페이먼츠 샌드박스(test_ck) 전용 테스트 카드 — 실제 결제되지 않습니다 */
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

/** `hair-{treatmentId}-{timestamp}` 주문번호에서 시술 ID 추출 */
export function extractTreatmentIdFromOrderId(orderId: string) {
  if (!orderId.startsWith('hair-')) {
    return null;
  }

  const withoutPrefix = orderId.slice(5);
  const lastDash = withoutPrefix.lastIndexOf('-');

  if (lastDash <= 0) {
    return null;
  }

  return withoutPrefix.slice(0, lastDash);
}

export function getPaymentRedirectUrls(treatmentId: string) {
  const tid = encodeURIComponent(treatmentId);

  return {
    successUrl: `${APP_SCHEME}://payment/success?tid=${tid}`,
    failUrl: `${APP_SCHEME}://payment/fail?tid=${tid}`,
  };
}

function parseUrlQuery(url: string) {
  const queryStart = url.indexOf('?');

  if (queryStart < 0) {
    return new URLSearchParams();
  }

  return new URLSearchParams(url.slice(queryStart + 1));
}

function resolveTreatmentIdFromParams(params: URLSearchParams, orderId?: string | null) {
  const tid = params.get('tid')?.trim();

  if (tid) {
    return tid;
  }

  if (orderId) {
    return extractTreatmentIdFromOrderId(orderId) ?? undefined;
  }

  return undefined;
}

export function parseTossSuccessUrl(url: string): TossPaymentSuccess | null {
  if (!url.includes('payment/success')) {
    return null;
  }

  try {
    const params = parseUrlQuery(url);

    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount') ?? '0');

    if (!paymentKey || !orderId) {
      return null;
    }

    return {
      paymentKey,
      orderId,
      amount,
      treatmentId: resolveTreatmentIdFromParams(params, orderId),
    };
  } catch {
    return null;
  }
}

export function parseTossFailUrl(url: string): TossPaymentFailure | null {
  if (!url.includes('payment/fail')) {
    return null;
  }

  try {
    const params = parseUrlQuery(url);

    return {
      code: params.get('code') ?? 'UNKNOWN',
      message: params.get('message') ?? '결제에 실패했습니다.',
      orderId: params.get('orderId') ?? undefined,
    };
  } catch {
    return null;
  }
}

export function isHairDiaryPaymentUrl(url: string) {
  const lower = url.trim().toLowerCase();
  return lower.startsWith(`${APP_SCHEME}://payment/`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** WebView에서 토스 결제창을 띄우는 HTML (React Native) */
export function buildTossPaymentWebViewHtml(
  params: TossPaymentParams & { clientKey: string; useDemoSimulator: boolean },
) {
  const { successUrl, failUrl } = getPaymentRedirectUrls(params.treatmentId);
  const safeOrderName = escapeHtml(params.orderName);
  const safeOrderId = escapeHtml(params.orderId);
  const safeClientKey = escapeHtml(params.clientKey);
  const safeSuccessUrl = escapeHtml(successUrl);
  const safeFailUrl = escapeHtml(failUrl);

  if (params.useDemoSimulator) {
    const demoKey = `demo_${params.treatmentId}_${Date.now()}`;
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#FAFAFC; padding:24px; }
    h1 { font-size:20px; color:#1A1A2E; margin-bottom:8px; }
    p { color:#6B6B7B; font-size:14px; text-align:center; line-height:1.5; }
    button { margin-top:24px; width:100%; max-width:320px; padding:16px; border:none; border-radius:14px; background:#FF5A5F; color:#fff; font-size:17px; font-weight:700; }
    .sub { margin-top:12px; font-size:12px; color:#9CA3AF; }
  </style>
</head>
<body>
  <h1>토스 테스트 결제</h1>
  <p>${safeOrderName}<br/>${params.amount.toLocaleString('ko-KR')}원</p>
  <button type="button" id="pay">테스트 결제 완료</button>
  <p class="sub">데모 모드 · 실제 카드 결제 없음</p>
  <script>
    document.getElementById('pay').onclick = function() {
      var q = 'paymentKey=${demoKey}&orderId=${safeOrderId}&amount=${params.amount}';
      window.location.href = '${safeSuccessUrl}?' + q;
    };
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://js.tosspayments.com/v2/standard"></script>
  <style>body { margin:0; background:#FAFAFC; }</style>
</head>
<body>
  <script>
    (async function () {
      try {
        var tossPayments = TossPayments('${safeClientKey}');
        var payment = tossPayments.payment({ customerKey: TossPayments.ANONYMOUS });
        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: ${params.amount} },
          orderId: '${safeOrderId}',
          orderName: '${safeOrderName}',
          successUrl: '${safeSuccessUrl}',
          failUrl: '${safeFailUrl}',
        });
      } catch (e) {
        var msg = encodeURIComponent(e.message || '결제를 시작하지 못했습니다.');
        window.location.href = '${safeFailUrl}?code=PAYMENT_START_FAILED&message=' + msg + '&orderId=${safeOrderId}';
      }
    })();
  </script>
</body>
</html>`;
}

/** Expo Web에서 @tosspayments/payment-sdk 직접 호출 */
export async function requestTossPaymentOnWeb(params: TossPaymentParams) {
  const clientKey = getTossClientKey();

  if (!clientKey) {
    throw new Error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다.');
  }

  const { successUrl, failUrl } = getPaymentRedirectUrls(params.treatmentId);
  const { loadTossPayments } = await import('@tosspayments/payment-sdk');
  const tossPayments = await loadTossPayments(clientKey);

  await tossPayments.requestPayment('카드', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl,
    failUrl,
  });
}

export function shouldUsePaymentWebView() {
  return Platform.OS !== 'web';
}

function isExpoGoRuntime() {
  return (
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo'
  );
}

/**
 * WebView 토스 결제 대신 앱 버튼 한 번으로 테스트·데모 결제 완료.
 * test_ck 샌드박스는 RN WebView에서 카드 결제·리다이렉트가 자주 막혀 무반응처럼 보입니다.
 */
export function shouldUseInAppDemoPayment() {
  if (isLocalPaymentSimulation()) {
    return true;
  }

  if (Platform.OS === 'web') {
    return false;
  }

  if (isDemoAuthMode || !isTossConfigured()) {
    return true;
  }

  if (isTossTestKey()) {
    return true;
  }

  return isExpoGoRuntime();
}

/** WebView 결제창 HTML — 샌드박스·Expo Go는 시뮬레이터(테스트 결제 완료 버튼) 사용 */
export function shouldUseWebViewPaymentSimulator() {
  return shouldUseInAppDemoPayment() || isTossTestKey() || !isTossConfigured();
}
