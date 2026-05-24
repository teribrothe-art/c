import { loadTossPayments } from '@tosspayments/payment-sdk';
import { Platform } from 'react-native';

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
  const { successUrl, failUrl } = getPaymentRedirectUrls();
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

  const { successUrl, failUrl } = getPaymentRedirectUrls();
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
