import { ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';

/** 누적 테스트 시드 ID — 전역 데모 저장소와 구분 (시드 생성 없이 prefix만 사용) */
export function isAccumulatedTestTreatmentId(id: string) {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => id.startsWith(config.treatmentIdPrefix));
}

export function isAccumulatedTestPaymentId(id: string) {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => id.startsWith(config.paymentIdPrefix));
}
