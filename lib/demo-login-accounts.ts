import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS, BETA_TEST_PASSWORD } from './beta-test-accounts';
import { ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE } from './demo-accumulated-test-data';
import {
  ACCUMULATED_TEST_CUSTOMERS,
  ACCUMULATED_TEST_CUSTOMERS_1Y,
  ACCUMULATED_TEST_CUSTOMERS_3Y,
  ACCUMULATED_TEST_CUSTOMERS_5Y,
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  ACCUMULATED_TEST_PASSWORD,
} from './demo-accumulated-test-accounts';
import { formatDesignerStoreLabel, ORG_STORE_DEFINITIONS } from './org-store-affiliation';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';
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
  searchHaystack?: string;
};

/** 테스트 로그인 화면 분류 순서 */
export const DEMO_LOGIN_GROUP_ORDER = ['기본', '매장', '디자이너', '가입고객'] as const;

export type DemoLoginGroupKey = (typeof DEMO_LOGIN_GROUP_ORDER)[number];

export const DEMO_LOGIN_GROUP_DESCRIPTIONS: Record<DemoLoginGroupKey, string> = {
  기본: '고객 · 본사 데모 계정',
  매장: '지역 핫플레이스 매장 전체 — 펼치면 목록 · 검색 가능',
  디자이너: '데모 · 베타 · 누적(1·2·3·5년) 전체 — 펼치면 목록 · 검색 가능',
  가입고객: '누적 테스트 디자이너 연동 고객 — 펼친 뒤 이름·이메일로 검색',
};

/** 탭하면 계정 목록을 펼치는 그룹 */
export const DEMO_LOGIN_COLLAPSIBLE_GROUPS: DemoLoginGroupKey[] = ['매장', '디자이너', '가입고객'];

export function isCollapsibleDemoLoginGroup(title: DemoLoginGroupKey) {
  return DEMO_LOGIN_COLLAPSIBLE_GROUPS.includes(title);
}

/** 검색창 표시 (디자이너·가입고객) */
export function isSearchableDemoLoginGroup(title: DemoLoginGroupKey) {
  return title === '매장' || title === '디자이너' || title === '가입고객';
}

/** 펼치면 검색 없이 전체 목록 표시 */
export function demoLoginGroupListsAllWhenExpanded(title: DemoLoginGroupKey) {
  return title === '매장' || title === '디자이너';
}

export function getDemoLoginSearchPlaceholder(title: DemoLoginGroupKey) {
  if (title === '매장') {
    return '매장명 · 지역 · 핫플레이스 · 이메일';
  }

  if (title === '디자이너') {
    return '이름 · 이메일 · 데모/베타/누적 · 매장명';
  }

  if (title === '가입고객') {
    return '이름 · 이메일 · 1년/2년/3년/5년 누적';
  }

  return '검색';
}

const ACCUMULATED_CUSTOMER_LOGIN_SOURCES = [
  { profileLabel: '1년 누적', customers: ACCUMULATED_TEST_CUSTOMERS_1Y },
  { profileLabel: '2년 누적', customers: ACCUMULATED_TEST_CUSTOMERS },
  { profileLabel: '3년 누적', customers: ACCUMULATED_TEST_CUSTOMERS_3Y },
  { profileLabel: '5년 누적', customers: ACCUMULATED_TEST_CUSTOMERS_5Y },
] as const;

export const ACCUMULATED_LOGIN_CUSTOMER_COUNT = ACCUMULATED_CUSTOMER_LOGIN_SOURCES.reduce(
  (sum, source) => sum + source.customers.length,
  0,
);

function designerSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

function accumulatedDesignerAccent(profileKey: string) {
  if (profileKey === '1y') {
    return '#00C2A8';
  }

  if (profileKey === '3y') {
    return '#F59E0B';
  }

  if (profileKey === '5y') {
    return '#E85D4C';
  }

  return '#7B5EE6';
}

const DEMO_DESIGNER_ACCOUNT: DemoLoginAccount = {
  id: 'demo-designer-local',
  group: '디자이너',
  roleLabel: '데모',
  loginLabel: '데모 디자이너 · 김미용',
  email: DEMO_LOGIN_HINT.designerEmail,
  password: DEMO_LOGIN_HINT.designerPassword,
  meta: formatDesignerStoreLabel('demo-designer-local'),
  accent: '#7B5EE6',
  searchHaystack: designerSearchHaystack([
    '데모',
    '디자이너',
    DEMO_LOGIN_HINT.designerEmail,
    '김미용',
    'demo-designer-local',
    formatDesignerStoreLabel('demo-designer-local'),
  ]),
};

const BETA_DESIGNER_ACCOUNTS: DemoLoginAccount[] = BETA_DESIGNERS.map((designer) => ({
  id: designer.id,
  group: '디자이너',
  roleLabel: '베타',
  loginLabel: designer.name,
  email: designer.email,
  password: designer.password,
  meta: formatDesignerStoreLabel(designer.id),
  accent: '#9B8AFB',
  searchHaystack: designerSearchHaystack([
    '베타',
    '디자이너',
    designer.name,
    designer.email,
    designer.id,
    formatDesignerStoreLabel(designer.id),
  ]),
}));

const ACCUMULATED_DESIGNER_ACCOUNTS: DemoLoginAccount[] = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map(
  (designer) => {
    const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[designer.profileKey];

    return {
      id: designer.id,
      group: '디자이너',
      roleLabel: '누적',
      loginLabel: designer.loginLabel,
      email: designer.email,
      password: designer.password,
      meta: stats
        ? `${formatDesignerStoreLabel(designer.id)} · ${stats.yearSpanLabel} · 시술 ${stats.treatmentCount}건`
        : formatDesignerStoreLabel(designer.id),
      accent: accumulatedDesignerAccent(designer.profileKey),
      searchHaystack: designerSearchHaystack([
        '누적',
        '디자이너',
        designer.loginLabel,
        designer.email,
        designer.profileKey,
        designer.id,
        formatDesignerStoreLabel(designer.id),
      ]),
    };
  },
);

/** 테스트 로그인 · 디자이너 탭 전체 (데모 1 + 베타 5 + 누적 4) */
export const ALL_DESIGNER_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  DEMO_DESIGNER_ACCOUNT,
  ...BETA_DESIGNER_ACCOUNTS,
  ...ACCUMULATED_DESIGNER_ACCOUNTS,
];

export const DESIGNER_LOGIN_COUNT = ALL_DESIGNER_LOGIN_ACCOUNTS.length;

function storeSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

const STORE_LOGIN_ACCOUNTS: DemoLoginAccount[] = STORE_TEST_ACCOUNTS.map((account) => {
  const orgStore = ORG_STORE_DEFINITIONS.find((store) => store.id === account.linkedOrgStoreId);
  const designerCount = orgStore?.designerIds.length ?? 0;
  const isLegacy = account.id === 'store-test';

  return {
    id: account.id,
    group: '매장',
    roleLabel: isLegacy ? '레거시' : '매장',
    loginLabel: isLegacy ? `${orgStore?.name ?? account.name} (store@)` : (orgStore?.name ?? account.name),
    email: account.email,
    password: account.password,
    meta: orgStore
      ? `${orgStore.region} · ${orgStore.hotPlace} · 디자이너 ${designerCount}명`
      : undefined,
    accent: '#0284C7',
    searchHaystack: storeSearchHaystack([
      '매장',
      account.name,
      account.email,
      account.id,
      orgStore?.name ?? '',
      orgStore?.region ?? '',
      orgStore?.hotPlace ?? '',
      isLegacy ? 'store@ 레거시' : '',
    ]),
  };
});

export const STORE_LOGIN_COUNT = STORE_LOGIN_ACCOUNTS.length;

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
    id: ADMIN_TEST_PUBLIC.id,
    group: '기본',
    roleLabel: '본사',
    loginLabel: '본사 어드민',
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    accent: '#4B5563',
  },
];

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
  ...STORE_LOGIN_ACCOUNTS,
  ...ALL_DESIGNER_LOGIN_ACCOUNTS,
  ...REGISTERED_CUSTOMER_ACCOUNTS,
];

export const DEMO_LOGIN_GROUPS = DEMO_LOGIN_GROUP_ORDER.map((title) => ({
  title,
  description: DEMO_LOGIN_GROUP_DESCRIPTIONS[title],
  accounts: DEMO_LOGIN_ACCOUNTS.filter((account) => account.group === title),
}));
