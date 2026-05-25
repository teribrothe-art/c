import type { UserRole } from './auth';

export const BETA_TEST_PASSWORD = 'beta1234';

export type BetaTestAccount = {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

/** 베타 테스트용 디자이너 5명 */
export const BETA_DESIGNERS: BetaTestAccount[] = [
  {
    id: 'beta-designer-01',
    email: 'beta-designer-1@hair.app',
    name: '베타디자이너1',
    password: BETA_TEST_PASSWORD,
    role: 'designer',
  },
  {
    id: 'beta-designer-02',
    email: 'beta-designer-2@hair.app',
    name: '베타디자이너2',
    password: BETA_TEST_PASSWORD,
    role: 'designer',
  },
  {
    id: 'beta-designer-03',
    email: 'beta-designer-3@hair.app',
    name: '베타디자이너3',
    password: BETA_TEST_PASSWORD,
    role: 'designer',
  },
  {
    id: 'beta-designer-04',
    email: 'beta-designer-4@hair.app',
    name: '베타디자이너4',
    password: BETA_TEST_PASSWORD,
    role: 'designer',
  },
  {
    id: 'beta-designer-05',
    email: 'beta-designer-5@hair.app',
    name: '베타디자이너5',
    password: BETA_TEST_PASSWORD,
    role: 'designer',
  },
];

/** 베타 테스트용 고객 5명 (로그인·초대 연동 테스트) */
export const BETA_CUSTOMERS: BetaTestAccount[] = [
  {
    id: 'beta-customer-01',
    email: 'beta-customer-1@hair.app',
    name: '베타고객1',
    password: BETA_TEST_PASSWORD,
    role: 'customer',
  },
  {
    id: 'beta-customer-02',
    email: 'beta-customer-2@hair.app',
    name: '베타고객2',
    password: BETA_TEST_PASSWORD,
    role: 'customer',
  },
  {
    id: 'beta-customer-03',
    email: 'beta-customer-3@hair.app',
    name: '베타고객3',
    password: BETA_TEST_PASSWORD,
    role: 'customer',
  },
  {
    id: 'beta-customer-04',
    email: 'beta-customer-4@hair.app',
    name: '베타고객4',
    password: BETA_TEST_PASSWORD,
    role: 'customer',
  },
  {
    id: 'beta-customer-05',
    email: 'beta-customer-5@hair.app',
    name: '베타고객5',
    password: BETA_TEST_PASSWORD,
    role: 'customer',
  },
];

export const BETA_CUSTOMER_EMAILS = BETA_CUSTOMERS.map((item) => item.email);

export function getBetaDesigner(index: number) {
  return BETA_DESIGNERS[index - 1];
}

export function getBetaCustomerEmail(index: number) {
  return BETA_CUSTOMER_EMAILS[index - 1];
}
