/**
 * @tosspayments/payment-sdk 는 브라우저 전용 — Expo Go 네이티브 번들에서 제외
 */
async function loadTossPayments() {
  throw new Error(
    'Toss Payments SDK는 웹 전용입니다. 앱에서는 WebView 결제 화면을 사용하세요.',
  );
}

module.exports = {
  loadTossPayments,
  clearTossPayments: () => undefined,
};
