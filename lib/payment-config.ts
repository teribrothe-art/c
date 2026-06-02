/**
 * 토스 결제 서버(실결제창·승인 API) 연동 여부.
 * 기본값: 끔 — 테스트·Expo Go에서는 앱 내 시뮬레이션만 사용.
 * 운영 연동 시 .env 에 EXPO_PUBLIC_ENABLE_PAYMENT_SERVER=true
 */
export function isPaymentServerEnabled() {
  return process.env.EXPO_PUBLIC_ENABLE_PAYMENT_SERVER === 'true';
}

/** 결제 서버 없이 로컬에서 결제 완료·에스크로·정산 플로우만 검증 */
export function isLocalPaymentSimulation() {
  return !isPaymentServerEnabled();
}
