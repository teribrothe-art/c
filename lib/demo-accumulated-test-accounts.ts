import type { BetaTestAccount } from './beta-test-accounts';

export const ACCUMULATED_TEST_PASSWORD = 'test1234';

/** 3년 누적 테스트용 디자이너 1명 */
export const ACCUMULATED_TEST_DESIGNER: BetaTestAccount = {
  id: 'test-designer-3y',
  email: 'test-designer@hair.app',
  name: '누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

const CUSTOMER_NAMES = [
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

/** 3년 누적 테스트용 고객 10명 */
export const ACCUMULATED_TEST_CUSTOMERS: BetaTestAccount[] = CUSTOMER_NAMES.map((name, index) => ({
  id: `test-customer-${String(index + 1).padStart(2, '0')}`,
  email: `test-customer-${index + 1}@hair.app`,
  name,
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'customer',
}));

export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ...ACCUMULATED_TEST_CUSTOMERS,
];

export const ACCUMULATED_TEST_LOGIN_SUMMARY = {
  designer: {
    email: ACCUMULATED_TEST_DESIGNER.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: ACCUMULATED_TEST_DESIGNER.name,
  },
  customers: ACCUMULATED_TEST_CUSTOMERS.map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
} as const;
