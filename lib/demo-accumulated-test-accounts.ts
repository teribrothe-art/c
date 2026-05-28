import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';

export const ACCUMULATED_TEST_PASSWORD = 'test1234';

const CUSTOMER_NAME_POOL = [
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

function buildAccumulatedCustomerPool(options: {
  idPrefix: string;
  emailPrefix: string;
  count: number;
  idPad: number;
}): BetaTestAccount[] {
  const { idPrefix, emailPrefix, count, idPad } = options;

  return Array.from({ length: count }, (_, index) => ({
    id: `${idPrefix}${String(index + 1).padStart(idPad, '0')}`,
    email: `${emailPrefix}${index + 1}@hair.app`,
    name: CUSTOMER_NAME_POOL[index % CUSTOMER_NAME_POOL.length],
    password: ACCUMULATED_TEST_PASSWORD,
    role: 'customer' as const,
  }));
}

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

/** 3년 누적 · 일 4~8명 · 단골 재방문 주기 */
export const ACCUMULATED_TEST_DESIGNER_ACCUM_3Y: BetaTestAccount = {
  id: 'test-designer-accum-3y',
  email: 'test-designer-accum-3y@hair.app',
  name: '3년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

/** 5년 누적 · 일 4~8명 · 단골 재방문 주기 */
export const ACCUMULATED_TEST_DESIGNER_ACCUM_5Y: BetaTestAccount = {
  id: 'test-designer-accum-5y',
  email: 'test-designer-accum-5y@hair.app',
  name: '5년 누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

export const ACCUMULATED_TEST_CUSTOMERS = buildAccumulatedCustomerPool({
  idPrefix: 'test-customer-',
  emailPrefix: 'test-customer-',
  count: 120,
  idPad: 2,
});

export const ACCUMULATED_TEST_CUSTOMERS_1Y = buildAccumulatedCustomerPool({
  idPrefix: 'test-1y-customer-',
  emailPrefix: 'test-1y-customer-',
  count: 80,
  idPad: 2,
});

export const ACCUMULATED_TEST_CUSTOMERS_3Y = buildAccumulatedCustomerPool({
  idPrefix: 'test-3y-customer-',
  emailPrefix: 'test-3y-customer-',
  count: 150,
  idPad: 3,
});

export const ACCUMULATED_TEST_CUSTOMERS_5Y = buildAccumulatedCustomerPool({
  idPrefix: 'test-5y-customer-',
  emailPrefix: 'test-5y-customer-',
  count: 200,
  idPad: 3,
});

export const ACCUMULATED_TEST_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] = [
  {
    key: '1y',
    designer: ACCUMULATED_TEST_DESIGNER_1Y,
    customers: ACCUMULATED_TEST_CUSTOMERS_1Y,
    historyYears: 1,
    dailyMin: 3,
    dailyMax: 5,
    treatmentIdPrefix: 'accum1y-treatment-',
    paymentIdPrefix: 'accum1y-payment-',
    visitCycleMode: true,
  },
  {
    key: '2y',
    designer: ACCUMULATED_TEST_DESIGNER,
    customers: ACCUMULATED_TEST_CUSTOMERS,
    historyYears: 2,
    dailyMin: 4,
    dailyMax: 6,
    treatmentIdPrefix: 'accum-treatment-',
    paymentIdPrefix: 'accum-payment-',
    visitCycleMode: true,
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
  {
    key: '5y',
    designer: ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
    customers: ACCUMULATED_TEST_CUSTOMERS_5Y,
    historyYears: 5,
    dailyMin: 4,
    dailyMax: 8,
    treatmentIdPrefix: 'accum5y-treatment-',
    paymentIdPrefix: 'accum5y-payment-',
    visitCycleMode: true,
  },
];

export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
  ...ACCUMULATED_TEST_CUSTOMERS,
  ...ACCUMULATED_TEST_CUSTOMERS_1Y,
  ...ACCUMULATED_TEST_CUSTOMERS_3Y,
  ...ACCUMULATED_TEST_CUSTOMERS_5Y,
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
  customers5y: ACCUMULATED_TEST_CUSTOMERS_5Y.slice(0, 10).map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
} as const;
