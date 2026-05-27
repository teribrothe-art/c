import { isAccumulatedTestPaymentId, isAccumulatedTestTreatmentId } from './demo-accumulated-ids';
import { ACCUMULATED_TEST_PROFILES } from './demo-accumulated-test-seeds';
import { applyAccumulatedTreatmentPatch } from './demo-accumulated-treatment-patches';
import type { PaymentRecord } from './payment-types';
import type { Treatment } from './treatments';

export { isAccumulatedTestPaymentId, isAccumulatedTestTreatmentId } from './demo-accumulated-ids';

function findProfileForUser(user: { id: string; role?: string | null } | null) {
  if (!user) {
    return null;
  }

  if (user.role === 'designer') {
    return ACCUMULATED_TEST_PROFILES.find((profile) => profile.designer.id === user.id) ?? null;
  }

  if (user.role === 'customer') {
    return (
      ACCUMULATED_TEST_PROFILES.find((profile) =>
        profile.customers.some((customer) => customer.id === user.id),
      ) ?? null
    );
  }

  return null;
}

export function shouldHydrateAccumulatedDemoDataForUser(user: {
  id: string;
  role?: string | null;
} | null) {
  return findProfileForUser(user) !== null;
}

export function mergeAccumulatedTreatmentsIntoStore(
  demoTreatments: Treatment[],
  user: { id: string; role?: string | null } | null,
): boolean {
  const profile = findProfileForUser(user);

  if (!profile) {
    return false;
  }

  let merged = false;

  for (const seed of profile.treatments) {
    if (!demoTreatments.some((item) => item.id === seed.id)) {
      demoTreatments.push(applyAccumulatedTreatmentPatch({ ...(seed as Treatment) }));
      merged = true;
    }
  }

  return merged;
}

export function mergeAccumulatedPaymentsIntoStore(
  demoPayments: PaymentRecord[],
  user: { id: string; role?: string | null } | null,
): boolean {
  const profile = findProfileForUser(user);

  if (!profile) {
    return false;
  }

  return mergeAccumulatedProfilePaymentsIntoStore(demoPayments, profile);
}

export function findAccumulatedProfileByDesignerId(designerId: string) {
  return ACCUMULATED_TEST_PROFILES.find((profile) => profile.designer.id === designerId) ?? null;
}

export function mergeAccumulatedPaymentsForDesignerId(
  demoPayments: PaymentRecord[],
  designerId: string,
): boolean {
  const profile = findAccumulatedProfileByDesignerId(designerId);

  if (!profile) {
    return false;
  }

  return mergeAccumulatedProfilePaymentsIntoStore(demoPayments, profile);
}

function mergeAccumulatedProfilePaymentsIntoStore(
  demoPayments: PaymentRecord[],
  profile: (typeof ACCUMULATED_TEST_PROFILES)[number],
): boolean {
  let merged = false;

  for (const seed of profile.payments) {
    if (!demoPayments.some((payment) => payment.id === seed.id)) {
      demoPayments.push({ ...seed });
      merged = true;
    }
  }

  return merged;
}

export function stripAccumulatedTreatmentsFromStore(demoTreatments: Treatment[]) {
  return demoTreatments.filter(
    (item) => typeof item.id !== 'string' || !isAccumulatedTestTreatmentId(item.id),
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
