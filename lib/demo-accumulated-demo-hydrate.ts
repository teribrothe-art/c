import { ACCUMULATED_DEMO_PAYMENTS, ACCUMULATED_DEMO_TREATMENTS } from './demo-accumulated-test-seeds';
import { ACCUMULATED_TEST_CUSTOMERS, ACCUMULATED_TEST_DESIGNER } from './demo-accumulated-test-accounts';
import type { PaymentRecord } from './payment-types';
import type { Treatment } from './treatments';

/** 누적 테스트 계정 시드 ID — 전역 데모 저장소와 구분 */
export function isAccumulatedTestTreatmentId(id: string) {
  return id.startsWith('accum-treatment-');
}

export function isAccumulatedTestPaymentId(id: string) {
  return id.startsWith('accum-payment-');
}

export function shouldHydrateAccumulatedDemoDataForUser(user: {
  id: string;
  role?: string | null;
} | null) {
  if (!user) {
    return false;
  }

  if (user.role === 'designer' && user.id === ACCUMULATED_TEST_DESIGNER.id) {
    return true;
  }

  if (user.role === 'customer') {
    return ACCUMULATED_TEST_CUSTOMERS.some((customer) => customer.id === user.id);
  }

  return false;
}

export function mergeAccumulatedTreatmentsIntoStore(
  demoTreatments: Treatment[],
): boolean {
  let merged = false;

  for (const seed of ACCUMULATED_DEMO_TREATMENTS) {
    if (!demoTreatments.some((item) => item.id === seed.id)) {
      demoTreatments.push({ ...(seed as Treatment) });
      merged = true;
    }
  }

  return merged;
}

export function mergeAccumulatedPaymentsIntoStore(demoPayments: PaymentRecord[]): boolean {
  let merged = false;

  for (const seed of ACCUMULATED_DEMO_PAYMENTS) {
    if (!demoPayments.some((payment) => payment.id === seed.id)) {
      demoPayments.push({ ...seed });
      merged = true;
    }
  }

  return merged;
}

export function stripAccumulatedTreatmentsFromStore(demoTreatments: Treatment[]) {
  return demoTreatments.filter(
    (item) =>
      !(
        item.designer_id === ACCUMULATED_TEST_DESIGNER.id &&
        typeof item.id === 'string' &&
        isAccumulatedTestTreatmentId(item.id)
      ),
  );
}

export function stripAccumulatedPaymentsFromStore(demoPayments: PaymentRecord[]) {
  return demoPayments.filter((payment) => !isAccumulatedTestPaymentId(payment.id));
}

/** AsyncStorage에는 누적 테스트 시드 제외 (Android CursorWindow 2MB 한도) */
export function treatmentsForDemoPersistence(demoTreatments: Treatment[]) {
  return stripAccumulatedTreatmentsFromStore(demoTreatments);
}

export function paymentsForDemoPersistence(demoPayments: PaymentRecord[]) {
  return stripAccumulatedPaymentsFromStore(demoPayments);
}
