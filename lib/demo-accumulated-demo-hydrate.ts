import { isAccumulatedTestPaymentId, isAccumulatedTestTreatmentId } from './demo-accumulated-ids';
import { getAccumulatedTestProfiles } from './demo-accumulated-test-seeds';
import { applyAccumulatedTreatmentPatch } from './demo-accumulated-treatment-patches';
import { findNationwideProfileByDesignerId } from './nationwide-designer-seed-registry';
import type { PaymentRecord } from './payment-types';
import type { Treatment } from './treatment-types';
import type { BuiltAccumulatedSeedProfile } from './demo-accumulated-seed-builder';

export { isAccumulatedTestPaymentId, isAccumulatedTestTreatmentId } from './demo-accumulated-ids';

let customerIdToProfileCache: Map<string, BuiltAccumulatedSeedProfile> | null = null;

function ensureCustomerProfileIndex() {
  if (customerIdToProfileCache) {
    return customerIdToProfileCache;
  }

  customerIdToProfileCache = new Map();

  for (const profile of getAccumulatedTestProfiles()) {
    for (const customer of profile.customers) {
      customerIdToProfileCache.set(customer.id, profile);
    }
  }

  return customerIdToProfileCache;
}

function findProfileForUser(user: { id: string; role?: string | null } | null) {
  if (!user) {
    return null;
  }

  if (user.role === 'designer') {
    return getAccumulatedTestProfiles().find((profile) => profile.designer.id === user.id) ?? null;
  }

  if (user.role === 'customer') {
    return ensureCustomerProfileIndex().get(user.id) ?? null;
  }

  return null;
}

export function shouldHydrateAccumulatedDemoDataForUser(user: {
  id: string;
  role?: string | null;
} | null) {
  return findProfileForUser(user) !== null;
}

function mergeAccumulatedProfileTreatmentsIntoStore(
  demoTreatments: Treatment[],
  profile: BuiltAccumulatedSeedProfile,
): boolean {
  const existingIds = new Set(demoTreatments.map((item) => item.id));
  let merged = false;

  for (const seed of profile.treatments) {
    if (!existingIds.has(seed.id)) {
      demoTreatments.push(applyAccumulatedTreatmentPatch({ ...(seed as Treatment) }));
      existingIds.add(seed.id);
      merged = true;
    }
  }

  return merged;
}

export function mergeAccumulatedTreatmentsIntoStore(
  demoTreatments: Treatment[],
  user: { id: string; role?: string | null } | null,
): boolean {
  const profile = findProfileForUser(user);

  if (!profile) {
    return false;
  }

  return mergeAccumulatedProfileTreatmentsIntoStore(demoTreatments, profile);
}

export function mergeAccumulatedTreatmentsForDesignerId(
  demoTreatments: Treatment[],
  designerId: string,
): boolean {
  const profile = findAccumulatedProfileByDesignerId(designerId);

  if (!profile) {
    return false;
  }

  return mergeAccumulatedProfileTreatmentsIntoStore(demoTreatments, profile);
}

export function mergeAllAccumulatedTreatmentsIntoStore(demoTreatments: Treatment[]): boolean {
  let merged = false;

  for (const profile of getAccumulatedTestProfiles()) {
    merged = mergeAccumulatedProfileTreatmentsIntoStore(demoTreatments, profile) || merged;
  }

  return merged;
}

export function mergeAllAccumulatedPaymentsIntoStore(demoPayments: PaymentRecord[]): boolean {
  let merged = false;

  for (const profile of getAccumulatedTestProfiles()) {
    merged = mergeAccumulatedProfilePaymentsIntoStore(demoPayments, profile) || merged;
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
  const nationwide = findNationwideProfileByDesignerId(designerId);

  if (nationwide) {
    return nationwide;
  }

  return getAccumulatedTestProfiles().find((profile) => profile.designer.id === designerId) ?? null;
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
  profile: BuiltAccumulatedSeedProfile,
): boolean {
  const existingIds = new Set(demoPayments.map((payment) => payment.id));
  let merged = false;

  for (const seed of profile.payments) {
    if (!existingIds.has(seed.id)) {
      demoPayments.push({ ...seed });
      existingIds.add(seed.id);
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

/** 고객 ID → 프로필 인덱스 캐시 초기화 */
export function clearAccumulatedDemoHydrateCache() {
  customerIdToProfileCache = null;
}
