import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';

export const ACCUMULATED_TEST_PASSWORD = 'test1234';

const CUSTOMER_NAMES_2Y = [
  '이서연',
  '박민준',
  '최유나',
  '정하은',
  '김도윤',
  '한지우',
  '오수아',
  '윤태희',
  '강예린',
  '임준서',
] as const;

const CUSTOMER_NAMES_1Y = [
  '송지아',
  '류현우',
  '문채원',
  '배서준',
  '남하린',
  '조민재',
  '홍수빈',
  '권도현',
  '서예원',
  '안시우',
] as const;

/** 2년 누적 테스트 디자이너 */
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

export const ACCUMULATED_TEST_CUSTOMERS: BetaTestAccount[] = CUSTOMER_NAMES_2Y.map((name, index) => ({
  id: `test-customer-${String(index + 1).padStart(2, '0')}`,
  email: `test-customer-${index + 1}@hair.app`,
  name,
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'customer',
}));

export const ACCUMULATED_TEST_CUSTOMERS_1Y: BetaTestAccount[] = CUSTOMER_NAMES_1Y.map((name, index) => ({
  id: `test-1y-customer-${String(index + 1).padStart(2, '0')}`,
  email: `test-1y-customer-${index + 1}@hair.app`,
  name,
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'customer',
}));

export const ACCUMULATED_TEST_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] = [
  {
    key: '2y',
    designer: ACCUMULATED_TEST_DESIGNER,
    customers: ACCUMULATED_TEST_CUSTOMERS,
    historyYears: 2,
    dailyMin: 1,
    dailyMax: 2,
    treatmentIdPrefix: 'accum-treatment-',
    paymentIdPrefix: 'accum-payment-',
  },
  {
    key: '1y',
    designer: ACCUMULATED_TEST_DESIGNER_1Y,
    customers: ACCUMULATED_TEST_CUSTOMERS_1Y,
    historyYears: 1,
    dailyMin: 1,
    dailyMax: 2,
    treatmentIdPrefix: 'accum1y-treatment-',
    paymentIdPrefix: 'accum1y-payment-',
  },
];

export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ...ACCUMULATED_TEST_CUSTOMERS,
  ...ACCUMULATED_TEST_CUSTOMERS_1Y,
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

export const ACCUMULATED_TEST_DESIGNERS_PUBLIC = [
  ACCUMULATED_TEST_DESIGNER_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_1Y_PUBLIC,
] as const;

export const ACCUMULATED_TEST_LOGIN_SUMMARY = {
  designers: ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  customers: ACCUMULATED_TEST_CUSTOMERS.map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
  customers1y: ACCUMULATED_TEST_CUSTOMERS_1Y.map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
} as const;
