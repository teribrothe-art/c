import { ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';
import { isNationwideDesignerId } from './nationwide-org-catalog';

/** 누적 테스트 시드 ID — 전역 데모 저장소와 구분 (시드 생성 없이 prefix만 사용) */
export function isAccumulatedTestTreatmentId(id: string) {
  if (id.includes('-nw-') && id.startsWith('accum-nw-')) {
    return true;
  }

  return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => id.startsWith(config.treatmentIdPrefix));
}

export function isAccumulatedTestPaymentId(id: string) {
  if (id.includes('-nw-') && id.startsWith('accum-nw-')) {
    return true;
  }

  return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => id.startsWith(config.paymentIdPrefix));
}

/** 누적 테스트 고객 ID (관계·저장소 정리용) */
export function isAccumulatedTestCustomerId(id: string) {
  if (id.startsWith('test-customer-')) {
    return true;
  }

  if (id.startsWith('test-1y-customer-')) {
    return true;
  }

  if (id.startsWith('test-3y-customer-')) {
    return true;
  }

  if (id.startsWith('test-5y-customer-')) {
    return true;
  }

  if (/^test-nw-\d+-customer-/.test(id)) {
    return true;
  }

  return /^test-exp-\d+-customer-/.test(id);
}

/** 누적 테스트 디자이너 ID (관계·저장소 정리용) */
export function isAccumulatedTestDesignerId(id: string) {
  if (isNationwideDesignerId(id)) {
    return true;
  }

  return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => config.designer.id === id);
}
