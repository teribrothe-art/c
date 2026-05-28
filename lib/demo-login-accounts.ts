import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_HINT } from './auth';
import { ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE } from './demo-accumulated-test-data';
import {
  ACCUMULATED_TEST_CUSTOMERS,
  ACCUMULATED_TEST_CUSTOMERS_1Y,
  ACCUMULATED_TEST_CUSTOMERS_5Y,
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  ACCUMULATED_TEST_PASSWORD,
} from './demo-accumulated-test-accounts';
import { STORE_TEST_PUBLIC } from './store-test-accounts';
import { colors } from './theme';

export type DemoLoginAccount = {
  id: string;
  group: string;
  roleLabel: string;
  loginLabel: string;
  email: string;
  password: string;
  meta?: string;
  accent: string;
  /** 가입고객 검색용 (이름·이메일·소속 누적 프로필) */
  searchHaystack?: string;
};

/** 테스트 로그인 화면 분류 순서 */
export const DEMO_LOGIN_GROUP_ORDER = ['기본', '누적 디자이너', '가입고객'] as const;

export type DemoLoginGroupKey = (typeof DEMO_LOGIN_GROUP_ORDER)[number];

export const DEMO_LOGIN_GROUP_DESCRIPTIONS: Record<DemoLoginGroupKey, string> = {
  기본: '고객 · 디자이너 · 매장 · 본사 데모 계정',
  '누적 디자이너': '1년 · 2년 · 5년 누적 · 단골 재방문 주기 시뮬레이션',
  가입고객: '누적 테스트 디자이너 연동 고객 — 펼친 뒤 이름·이메일로 검색',
};

/** 탭하면 계정 목록을 펼치는 그룹 */
export const DEMO_LOGIN_COLLAPSIBLE_GROUPS: DemoLoginGroupKey[] = ['가입고객'];

export function isCollapsibleDemoLoginGroup(title: DemoLoginGroupKey) {
  return DEMO_LOGIN_COLLAPSIBLE_GROUPS.includes(title);
}

export function isSearchableDemoLoginGroup(title: DemoLoginGroupKey) {
  return title === '가입고객';
}

const ACCUMULATED_CUSTOMER_LOGIN_SOURCES = [
  { profileLabel: '1년 누적', customers: ACCUMULATED_TEST_CUSTOMERS_1Y },
  { profileLabel: '2년 누적', customers: ACCUMULATED_TEST_CUSTOMERS },
  { profileLabel: '5년 누적', customers: ACCUMULATED_TEST_CUSTOMERS_5Y },
] as const;

export const ACCUMULATED_LOGIN_CUSTOMER_COUNT = ACCUMULATED_CUSTOMER_LOGIN_SOURCES.reduce(
  (sum, source) => sum + source.customers.length,
  0,
);

const BASIC_ACCOUNTS: DemoLoginAccount[] = [
  {
    id: 'demo-customer',
    group: '기본',
    roleLabel: '고객',
    loginLabel: '데모 고객',
    email: DEMO_LOGIN_HINT.customerEmail,
    password: DEMO_LOGIN_HINT.customerPassword,
    accent: colors.coral,
  },
  {
    id: 'demo-designer',
    group: '기본',
    roleLabel: '디자이너',
    loginLabel: '데모 디자이너',
    email: DEMO_LOGIN_HINT.designerEmail,
    password: DEMO_LOGIN_HINT.designerPassword,
    accent: '#7B5EE6',
  },
  {
    id: STORE_TEST_PUBLIC.id,
    group: '기본',
    roleLabel: '매장',
    loginLabel: '데모 매장',
    email: STORE_TEST_PUBLIC.email,
    password: STORE_TEST_PUBLIC.password,
    accent: '#0284C7',
  },
  {
    id: ADMIN_TEST_PUBLIC.id,
    group: '기본',
    roleLabel: '본사',
    loginLabel: '본사 어드민',
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    accent: '#4B5563',
  },
];

const ACCUMULATED_ACCOUNTS: DemoLoginAccount[] = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map(
  (designer) => {
    const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[designer.profileKey];
    const accent =
      designer.profileKey === '1y'
        ? '#00C2A8'
        : designer.profileKey === '5y'
          ? '#E85D4C'
          : '#7B5EE6';

    return {
      id: designer.id,
      group: '누적 디자이너',
      roleLabel: '디자이너',
      loginLabel: designer.loginLabel,
      email: designer.email,
      password: designer.password,
      meta: stats
        ? `${stats.yearSpanLabel} · 시술 ${stats.treatmentCount}건 · 고객 ${stats.customerCount}명`
        : undefined,
      accent,
    };
  },
);

const REGISTERED_CUSTOMER_ACCOUNTS: DemoLoginAccount[] = ACCUMULATED_CUSTOMER_LOGIN_SOURCES.flatMap(
  ({ profileLabel, customers }) =>
    customers.map((customer, index) => {
      const haystack = [
        customer.name,
        customer.email,
        customer.id,
        profileLabel,
        '누적',
        '가입고객',
      ]
        .join(' ')
        .toLowerCase();

      return {
        id: customer.id,
        group: '가입고객',
        roleLabel: '고객',
        loginLabel: customer.name ?? customer.email,
        email: customer.email,
        password: ACCUMULATED_TEST_PASSWORD,
        meta: `${profileLabel} 디자이너 · ${index + 1}/${customers.length}`,
        accent: colors.coral,
        searchHaystack: haystack,
      };
    }),
);

export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  ...BASIC_ACCOUNTS,
  ...ACCUMULATED_ACCOUNTS,
  ...REGISTERED_CUSTOMER_ACCOUNTS,
];

export const DEMO_LOGIN_GROUPS = DEMO_LOGIN_GROUP_ORDER.map((title) => ({
  title,
  description: DEMO_LOGIN_GROUP_DESCRIPTIONS[title],
  accounts: DEMO_LOGIN_ACCOUNTS.filter((account) => account.group === title),
}));
