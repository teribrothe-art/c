import type { BetaTestAccount } from './beta-test-accounts';
import { BETA_DESIGNERS } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import { CUSTOMER_NAME_POOL } from './demo-customer-name-pool';
import {
  LEGACY_ACCUMULATED_CUSTOMER_COUNTS,
  LEGACY_ACCUMULATED_TEST_PASSWORD,
} from './demo-legacy-accumulated-customers';

/** 베타 디자이너 — 3년 누적 테스트와 동일 스펙 */
export const BETA_DESIGNER_HISTORY_YEARS = 3;
export const BETA_DESIGNER_CUSTOMER_COUNT = LEGACY_ACCUMULATED_CUSTOMER_COUNTS['3y'];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function isBetaProfileKey(profileKey: string) {
  return /^beta-\d{2}$/.test(profileKey);
}

const betaCustomersCache = new Map<string, BetaTestAccount[]>();

/** 베타 디자이너 연동 고객 — 프로필별 지연 생성 */
export function getBetaDesignerCustomers(profileKey: string): BetaTestAccount[] {
  const cached = betaCustomersCache.get(profileKey);

  if (cached) {
    return cached;
  }

  const match = /^beta-(\d{2})$/.exec(profileKey);

  if (!match) {
    return [];
  }

  const slot = Number(match[1]);
  const designer = BETA_DESIGNERS[slot - 1];

  if (!designer) {
    return [];
  }

  const customers = Array.from({ length: BETA_DESIGNER_CUSTOMER_COUNT }, (_, index) => ({
    id: `beta${pad2(slot)}-customer-${String(index + 1).padStart(3, '0')}`,
    email: `beta${pad2(slot)}-customer-${index + 1}@hair.app`,
    name: CUSTOMER_NAME_POOL[(slot + index) % CUSTOMER_NAME_POOL.length],
    password: LEGACY_ACCUMULATED_TEST_PASSWORD,
    role: 'customer' as const,
  }));

  betaCustomersCache.set(profileKey, customers);

  return customers;
}

export const BETA_DESIGNER_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] = BETA_DESIGNERS.map(
  (designer, index) => ({
    key: `beta-${pad2(index + 1)}`,
    designer,
    customers: [],
    customerCount: BETA_DESIGNER_CUSTOMER_COUNT,
    historyYears: BETA_DESIGNER_HISTORY_YEARS,
    dailyMin: 2,
    dailyMax: 5,
    treatmentIdPrefix: `beta${pad2(index + 1)}-treatment-`,
    paymentIdPrefix: `beta${pad2(index + 1)}-payment-`,
    visitCycleMode: true,
  }),
);
