import { ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';
import {
  isAccumulatedTestCustomerId,
  isAccumulatedTestPaymentId,
  isAccumulatedTestTreatmentId,
} from './demo-accumulated-ids';
import { isFleetProfileKey } from './demo-fleet-100-designers';
import { resolveAccumulatedProfileCustomers } from './demo-accumulated-profile-customers';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import {
  ensureAccumulatedProfileBuilt,
  ensureAccumulatedProfileBuiltByDesignerId,
} from './demo-accumulated-test-seeds';
import { applyAccumulatedTreatmentPatch } from './demo-accumulated-treatment-patches';
import type { BuiltAccumulatedSeedProfile } from './demo-accumulated-seed-builder';
import type { PaymentRecord } from './payment-types';
import type { Treatment } from './treatment-types';

export { isAccumulatedTestPaymentId, isAccumulatedTestTreatmentId } from './demo-accumulated-ids';

let customerIdToConfigCache: Map<string, AccumulatedSeedProfileConfig> | null = null;

function ensureCustomerConfigIndex() {
  if (customerIdToConfigCache) {
    return customerIdToConfigCache;
  }

  customerIdToConfigCache = new Map();

  for (const config of ACCUMULATED_TEST_PROFILE_CONFIGS) {
    if (isFleetProfileKey(config.key)) {
      continue;
    }

    for (const customer of resolveAccumulatedProfileCustomers(config)) {
      customerIdToConfigCache.set(customer.id, config);
    }
  }

  return customerIdToConfigCache;
}

function findProfileForUser(user: { id: string; role?: string | null } | null) {
  if (!user) {
    return null;
  }

  if (user.role === 'designer') {
    return ensureAccumulatedProfileBuiltByDesignerId(user.id) ?? null;
  }

  if (user.role === 'customer') {
    const fleetMatch = /^test-fleet-(\d{3})-customer-/.exec(user.id);

    if (fleetMatch) {
      return ensureAccumulatedProfileBuilt(`fleet-${fleetMatch[1]}`) ?? null;
    }

    const config = ensureCustomerConfigIndex().get(user.id);

    if (!config) {
      return null;
    }

    return ensureAccumulatedProfileBuilt(config.key) ?? null;
  }

  return null;
}

export function shouldHydrateAccumulatedDemoDataForUser(user: {
  id: string;
  role?: string | null;
} | null) {
  if (!user) {
    return false;
  }

  if (user.role === 'designer') {
    return ACCUMULATED_TEST_PROFILE_CONFIGS.some((config) => config.designer.id === user.id);
  }

  if (user.role === 'customer') {
    return isAccumulatedTestCustomerId(user.id);
  }

  return false;
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

  for (const config of ACCUMULATED_TEST_PROFILE_CONFIGS) {
    const profile = ensureAccumulatedProfileBuilt(config.key);

    if (profile) {
      merged = mergeAccumulatedProfileTreatmentsIntoStore(demoTreatments, profile) || merged;
    }
  }

  return merged;
}

export function mergeAllAccumulatedPaymentsIntoStore(demoPayments: PaymentRecord[]): boolean {
  let merged = false;

  for (const config of ACCUMULATED_TEST_PROFILE_CONFIGS) {
    const profile = ensureAccumulatedProfileBuilt(config.key);

    if (profile) {
      merged = mergeAccumulatedProfilePaymentsIntoStore(demoPayments, profile) || merged;
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
  return ensureAccumulatedProfileBuiltByDesignerId(designerId) ?? null;
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
  customerIdToConfigCache = null;
}
