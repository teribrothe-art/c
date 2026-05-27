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

const CUSTOMER_NAME_POOL_3Y = [
  '김나래',
  '이준호',
  '박서윤',
  '최민서',
  '정다은',
  '한승우',
  '오지민',
  '윤하린',
  '강태오',
  '임소연',
  '송현우',
  '류채원',
  '문지후',
  '배수아',
  '남건우',
  '조예린',
  '홍도윤',
  '권시우',
  '서유진',
  '안지원',
  '김태리',
  '이하늘',
  '박도현',
  '최서아',
  '정민재',
  '한유나',
  '오세준',
  '윤채은',
  '강지안',
  '임현서',
  '송다인',
  '류민호',
  '문서연',
  '배준영',
  '남소희',
  '조은우',
  '홍가영',
  '권도훈',
  '서예준',
  '안시온',
  '김라온',
  '이수빈',
  '박건희',
  '최유림',
  '정하람',
  '한지훈',
  '오서진',
  '윤나윤',
  '강민지',
  '임채우',
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

/** 3년 누적 · 일 4~8명 · 단골 재방문 주기 */
export const ACCUMULATED_TEST_DESIGNER_ACCUM_3Y: BetaTestAccount = {
  id: 'test-designer-accum-3y',
  email: 'test-designer-accum-3y@hair.app',
  name: '3년 누적테스트 디자이너',
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

export const ACCUMULATED_TEST_CUSTOMERS_3Y: BetaTestAccount[] = Array.from(
  { length: 150 },
  (_, index) => ({
    id: `test-3y-customer-${String(index + 1).padStart(3, '0')}`,
    email: `test-3y-customer-${index + 1}@hair.app`,
    name: CUSTOMER_NAME_POOL_3Y[index % CUSTOMER_NAME_POOL_3Y.length],
    password: ACCUMULATED_TEST_PASSWORD,
    role: 'customer' as const,
  }),
);

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
  {
    key: '3y',
    designer: ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
    customers: ACCUMULATED_TEST_CUSTOMERS_3Y,
    historyYears: 3,
    dailyMin: 4,
    dailyMax: 8,
    treatmentIdPrefix: 'accum3y-treatment-',
    paymentIdPrefix: 'accum3y-payment-',
    visitCycleMode: true,
  },
];

export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
  ...ACCUMULATED_TEST_CUSTOMERS,
  ...ACCUMULATED_TEST_CUSTOMERS_1Y,
  ...ACCUMULATED_TEST_CUSTOMERS_3Y,
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

export const ACCUMULATED_TEST_DESIGNERS_PUBLIC = [
  ACCUMULATED_TEST_DESIGNER_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_1Y_PUBLIC,
  ACCUMULATED_TEST_DESIGNER_3Y_PUBLIC,
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
  customers3y: ACCUMULATED_TEST_CUSTOMERS_3Y.slice(0, 10).map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
} as const;
