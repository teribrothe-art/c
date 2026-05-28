import { ACCUMULATED_TEST_PROFILES } from './demo-accumulated-test-seeds';

/** 누적 테스트 시드 ID — 전역 데모 저장소와 구분 */
export function isAccumulatedTestTreatmentId(id: string) {
  return ACCUMULATED_TEST_PROFILES.some((profile) => id.startsWith(profile.treatmentIdPrefix));
}

export function isAccumulatedTestPaymentId(id: string) {
  return ACCUMULATED_TEST_PROFILES.some((profile) => id.startsWith(profile.paymentIdPrefix));
}
