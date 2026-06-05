import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import {
  FLEET_100_DESIGNER_ACCOUNTS,
  FLEET_100_COUNT,
  FLEET_100_DESIGNERS_PUBLIC,
  FLEET_100_PROFILE_CONFIGS,
} from './demo-fleet-100-designers';
import { BETA_DESIGNER_PROFILE_CONFIGS } from './demo-beta-designer-profiles';
import {
  getLegacyAccumulatedCustomers,
  LEGACY_ACCUMULATED_CUSTOMER_COUNTS,
  LEGACY_ACCUMULATED_TEST_PASSWORD,
} from './demo-legacy-accumulated-customers';

export const ACCUMULATED_TEST_PASSWORD = LEGACY_ACCUMULATED_TEST_PASSWORD;

export { CUSTOMER_NAME_POOL } from './demo-customer-name-pool';

/** 2년 누적 테스트 디자이너 (ID는 기존 호환용 test-designer-3y 유지) */
export const ACCUMULATED_TEST_DESIGNER: BetaTestAccount = {
  id: 'test-designer-3y',
  email: 'test-designer@hair.app',
  name: '2년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

/** 1년 누적 테스트 디자이너 */
export const ACCUMULATED_TEST_DESIGNER_1Y: BetaTestAccount = {
  id: 'test-designer-1y',
  email: 'test-designer-1y@hair.app',
  name: '1년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

/** 3년 누적 · 경량 시드 */
export const ACCUMULATED_TEST_DESIGNER_ACCUM_3Y: BetaTestAccount = {
  id: 'test-designer-accum-3y',
  email: 'test-designer-accum-3y@hair.app',
  name: '3년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

/** 5년 누적 · 경량 시드 */
export const ACCUMULATED_TEST_DESIGNER_ACCUM_5Y: BetaTestAccount = {
  id: 'test-designer-accum-5y',
  email: 'test-designer-accum-5y@hair.app',
  name: '5년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

/** @deprecated getLegacyAccumulatedCustomers('2y') — 앱 시작 시 배열 생성 없음 */
export function getAccumulatedTestCustomers2y() {
  return getLegacyAccumulatedCustomers('2y');
}

/** @deprecated getLegacyAccumulatedCustomers('1y') */
export function getAccumulatedTestCustomers1y() {
  return getLegacyAccumulatedCustomers('1y');
}

export const ACCUMULATED_TEST_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] = [
  {
    key: '1y',
    designer: ACCUMULATED_TEST_DESIGNER_1Y,
    customers: [],
    customerCount: LEGACY_ACCUMULATED_CUSTOMER_COUNTS['1y'],
    historyYears: 1,
    dailyMin: 2,
    dailyMax: 3,
    treatmentIdPrefix: 'accum1y-treatment-',
    paymentIdPrefix: 'accum1y-payment-',
    visitCycleMode: true,
  },
  {
    key: '2y',
    designer: ACCUMULATED_TEST_DESIGNER,
    customers: [],
    customerCount: LEGACY_ACCUMULATED_CUSTOMER_COUNTS['2y'],
    historyYears: 2,
    dailyMin: 2,
    dailyMax: 4,
    treatmentIdPrefix: 'accum-treatment-',
    paymentIdPrefix: 'accum-payment-',
    visitCycleMode: true,
  },
  {
    key: '3y',
    designer: ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
    customers: [],
    customerCount: LEGACY_ACCUMULATED_CUSTOMER_COUNTS['3y'],
    historyYears: 3,
    dailyMin: 2,
    dailyMax: 5,
    treatmentIdPrefix: 'accum3y-treatment-',
    paymentIdPrefix: 'accum3y-payment-',
    visitCycleMode: true,
  },
  {
    key: '5y',
    designer: ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
    customers: [],
    customerCount: LEGACY_ACCUMULATED_CUSTOMER_COUNTS['5y'],
    historyYears: 5,
    dailyMin: 2,
    dailyMax: 5,
    treatmentIdPrefix: 'accum5y-treatment-',
    paymentIdPrefix: 'accum5y-payment-',
    visitCycleMode: true,
  },
  ...BETA_DESIGNER_PROFILE_CONFIGS,
  ...FLEET_100_PROFILE_CONFIGS,
];

/** @deprecated 로그인 카탈로그는 demo-catalog-accounts 사용 — 디자이너만 포함 */
export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
  ...FLEET_100_DESIGNER_ACCOUNTS,
];

export const ACCUMULATED_TEST_DESIGNER_PUBLIC = {
  id: ACCUMULATED_TEST_DESIGNER.id,
  email: ACCUMULATED_TEST_DESIGNER.email,
  password: ACCUMULATED_TEST_PASSWORD,
  name: ACCUMULATED_TEST_DESIGNER.name,
  profileKey: '2y' as const,
  loginLabel: '2년 누적 테스트 디자이너',
} as const;

export const ACCUMULATED_TEST_DESIGNER_1Y_PUBLIC = {
  id: ACCUMULATED_TEST_DESIGNER_1Y.id,
  email: ACCUMULATED_TEST_DESIGNER_1Y.email,
  password: ACCUMULATED_TEST_PASSWORD,
  name: ACCUMULATED_TEST_DESIGNER_1Y.name,
  profileKey: '1y' as const,
  loginLabel: '1년 누적 테스트 디자이너',
} as const;

export const ACCUMULATED_TEST_DESIGNER_3Y_PUBLIC = {
  id: ACCUMULATED_TEST_DESIGNER_ACCUM_3Y.id,
  email: ACCUMULATED_TEST_DESIGNER_ACCUM_3Y.email,
  password: ACCUMULATED_TEST_PASSWORD,
  name: ACCUMULATED_TEST_DESIGNER_ACCUM_3Y.name,
  profileKey: '3y' as const,
  loginLabel: '3년 누적 테스트 디자이너',
} as const;

export const ACCUMULATED_TEST_DESIGNER_5Y_PUBLIC = {
  id: ACCUMULATED_TEST_DESIGNER_ACCUM_5Y.id,
  email: ACCUMULATED_TEST_DESIGNER_ACCUM_5Y.email,
  password: ACCUMULATED_TEST_PASSWORD,
  name: ACCUMULATED_TEST_DESIGNER_ACCUM_5Y.name,
  profileKey: '5y' as const,
  loginLabel: '5년 누적 테스트 디자이너',
} as const;

export const ACCUMULATED_TEST_DESIGNERS_PUBLIC = [
  ACCUMULATED_TEST_DESIGNER_1Y_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_3Y_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_5Y_PUBLIC,
  ...FLEET_100_DESIGNERS_PUBLIC,
] as const;

export const EXPANDED_STORE_DESIGNER_COUNT = FLEET_100_COUNT;

export function findAccumulatedProfileConfigByTreatmentId(treatmentId: string) {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.find((config) =>
    treatmentId.startsWith(config.treatmentIdPrefix),
  );
}

let accumulatedTestLoginSummaryCache: {
  designers: typeof ACCUMULATED_TEST_DESIGNERS_PUBLIC;
  customers: { email: string; password: string; name: string | null }[];
  customers1y: { email: string; password: string; name: string | null }[];
  customers3y: { email: string; password: string; name: string | null }[];
  customers5y: { email: string; password: string; name: string | null }[];
} | null = null;

export function getAccumulatedTestLoginSummary() {
  if (!accumulatedTestLoginSummaryCache) {
    accumulatedTestLoginSummaryCache = {
      designers: ACCUMULATED_TEST_DESIGNERS_PUBLIC,
      customers: getLegacyAccumulatedCustomers('2y').map((customer) => ({
        email: customer.email,
        password: ACCUMULATED_TEST_PASSWORD,
        name: customer.name,
      })),
      customers1y: getLegacyAccumulatedCustomers('1y').map((customer) => ({
        email: customer.email,
        password: ACCUMULATED_TEST_PASSWORD,
        name: customer.name,
      })),
      customers3y: getLegacyAccumulatedCustomers('3y')
        .slice(0, 10)
        .map((customer) => ({
          email: customer.email,
          password: ACCUMULATED_TEST_PASSWORD,
          name: customer.name,
        })),
      customers5y: getLegacyAccumulatedCustomers('5y')
        .slice(0, 10)
        .map((customer) => ({
          email: customer.email,
          password: ACCUMULATED_TEST_PASSWORD,
          name: customer.name,
        })),
    };
  }

  return accumulatedTestLoginSummaryCache;
}

/** @deprecated getAccumulatedTestLoginSummary() */
export const ACCUMULATED_TEST_LOGIN_SUMMARY = new Proxy({} as ReturnType<typeof getAccumulatedTestLoginSummary>, {
  get(_target, prop) {
    const summary = getAccumulatedTestLoginSummary();
    const value = Reflect.get(summary, prop);

    return typeof value === 'function' ? value.bind(summary) : value;
  },
});
