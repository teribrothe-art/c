import type { BetaTestAccount } from './beta-test-accounts';
import { CUSTOMER_NAME_POOL } from './demo-customer-name-pool';

export const LEGACY_ACCUMULATED_TEST_PASSWORD = 'test1234';

/** 누적 테스트 디자이너(1·2·3·5년) — 경량 고객 수 */
export const LEGACY_ACCUMULATED_CUSTOMER_COUNTS = {
  '1y': 12,
  '2y': 18,
  '3y': 22,
  '5y': 28,
} as const;

type LegacyProfileKey = keyof typeof LEGACY_ACCUMULATED_CUSTOMER_COUNTS;

const LEGACY_CUSTOMER_POOLS: Record<
  LegacyProfileKey,
  { idPrefix: string; emailPrefix: string; idPad: number }
> = {
  '1y': { idPrefix: 'test-1y-customer-', emailPrefix: 'test-1y-customer-', idPad: 2 },
  '2y': { idPrefix: 'test-customer-', emailPrefix: 'test-customer-', idPad: 2 },
  '3y': { idPrefix: 'test-3y-customer-', emailPrefix: 'test-3y-customer-', idPad: 3 },
  '5y': { idPrefix: 'test-5y-customer-', emailPrefix: 'test-5y-customer-', idPad: 3 },
};

const legacyCustomersCache = new Map<string, BetaTestAccount[]>();

function isLegacyProfileKey(profileKey: string): profileKey is LegacyProfileKey {
  return profileKey in LEGACY_ACCUMULATED_CUSTOMER_COUNTS;
}

function buildLegacyCustomers(profileKey: LegacyProfileKey): BetaTestAccount[] {
  const count = LEGACY_ACCUMULATED_CUSTOMER_COUNTS[profileKey];
  const pool = LEGACY_CUSTOMER_POOLS[profileKey];

  return Array.from({ length: count }, (_, index) => ({
    id: `${pool.idPrefix}${String(index + 1).padStart(pool.idPad, '0')}`,
    email: `${pool.emailPrefix}${index + 1}@hair.app`,
    name: CUSTOMER_NAME_POOL[index % CUSTOMER_NAME_POOL.length],
    password: LEGACY_ACCUMULATED_TEST_PASSWORD,
    role: 'customer' as const,
  }));
}

/** 누적 1·2·3·5년 프로필 고객 — 첫 접근 시에만 생성 */
export function getLegacyAccumulatedCustomers(profileKey: string): BetaTestAccount[] {
  if (!isLegacyProfileKey(profileKey)) {
    return [];
  }

  const cached = legacyCustomersCache.get(profileKey);

  if (cached) {
    return cached;
  }

  const customers = buildLegacyCustomers(profileKey);
  legacyCustomersCache.set(profileKey, customers);

  return customers;
}
