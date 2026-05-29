import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS, BETA_TEST_PASSWORD } from './beta-test-accounts';
import {
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  EXPANDED_STORE_DESIGNER_COUNT,
} from './demo-accumulated-test-accounts';
import {
  DESIGNER_LINKED_CUSTOMER_COUNT,
  getDesignerLinkedCustomerLoginSources,
} from './demo-designer-linked-customers';
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
export const DEMO_LOGIN_GROUP_ORDER = ['기본', '본사', '매장', '디자이너', '가입고객'] as const;

export type DemoLoginGroupKey = (typeof DEMO_LOGIN_GROUP_ORDER)[number];

export const DEMO_LOGIN_GROUP_DESCRIPTIONS: Record<DemoLoginGroupKey, string> = {
  기본: '데모 고객 계정',
  본사: '본사 어드민 · 전체 매장·디자이너·매출 조회',
  매장: '지역 핫플레이스 매장 전체 — 펼치면 목록 · 검색 가능',
  디자이너: `데모 · 베타 · 누적 · 증원 ${EXPANDED_STORE_DESIGNER_COUNT}명 — 펼치면 목록 · 검색 가능`,
  가입고객: '디자이너 연동 고객 전체(데모·베타·누적·증원) — 펼친 뒤 검색',
};

/** 탭하면 계정 목록을 펼치는 그룹 */
export const DEMO_LOGIN_COLLAPSIBLE_GROUPS: DemoLoginGroupKey[] = [
  '본사',
  '매장',
  '디자이너',
  '가입고객',
];

export function isCollapsibleDemoLoginGroup(title: DemoLoginGroupKey) {
  return DEMO_LOGIN_COLLAPSIBLE_GROUPS.includes(title);
}

/** 검색창 표시 (디자이너·가입고객) */
export function isSearchableDemoLoginGroup(title: DemoLoginGroupKey) {
  return title === '매장' || title === '디자이너' || title === '가입고객';
}

/** 펼치면 검색 없이 전체 목록 표시 */
export function demoLoginGroupListsAllWhenExpanded(title: DemoLoginGroupKey) {
  return title === '본사' || title === '매장' || title === '디자이너';
}

export function getDemoLoginSearchPlaceholder(title: DemoLoginGroupKey) {
  if (title === '매장') {
    return '매장명 · 지역 · 핫플레이스 · 이메일';
  }

  if (title === '디자이너') {
    return '이름 · 이메일 · 데모/베타/누적 · 매장명';
  }

  if (title === '가입고객') {
    return '이름 · 이메일 · 디자이너 · 데모/베타/누적/증원';
  }

  return '검색';
}

/** @deprecated DESIGNER_LINKED_CUSTOMER_COUNT 사용 */
export const ACCUMULATED_LOGIN_CUSTOMER_COUNT = DESIGNER_LINKED_CUSTOMER_COUNT;

function designerSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

function accumulatedDesignerYearLabel(profileKey: string) {
  if (profileKey === '1y') {
    return '1년';
  }

  if (profileKey === '3y') {
    return '3년';
  }

  if (profileKey === '5y') {
    return '5년';
  }

  if (profileKey.startsWith('exp-')) {
    return '증원';
  }

  return '2년';
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

function accumulatedDesignerRoleLabel(profileKey: string) {
  return profileKey.startsWith('exp-') ? '증원' : '누적';
}

const ACCUMULATED_DESIGNER_ACCOUNTS: DemoLoginAccount[] = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map(
  (designer) => {
    const roleLabel = accumulatedDesignerRoleLabel(designer.profileKey);
    const yearLabel = accumulatedDesignerYearLabel(designer.profileKey);

    return {
      id: designer.id,
      group: '디자이너',
      roleLabel,
      loginLabel: designer.loginLabel,
      email: designer.email,
      password: designer.password,
      meta: `${formatDesignerStoreLabel(designer.id)} · ${yearLabel} 누적`,
      accent: accumulatedDesignerAccent(designer.profileKey),
      searchHaystack: designerSearchHaystack([
        roleLabel,
        '누적',
        '증원',
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

/** 테스트 로그인 · 디자이너 탭 전체 (데모 1 + 베타 5 + 누적 4 + 증원 15) */
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
];

const ADMIN_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  {
    id: ADMIN_TEST_PUBLIC.id,
    group: '본사',
    roleLabel: '본사',
    loginLabel: ADMIN_TEST_PUBLIC.loginLabel,
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    meta: '전체 핫플레이스 · 디자이너 · 매출',
    accent: '#4B5563',
    searchHaystack: ['본사', '어드민', 'admin', ADMIN_TEST_PUBLIC.email, 'hq-admin']
      .join(' ')
      .toLowerCase(),
  },
];

export const ADMIN_LOGIN_COUNT = ADMIN_LOGIN_ACCOUNTS.length;

function buildRegisteredCustomerLoginAccounts(): DemoLoginAccount[] {
  return getDesignerLinkedCustomerLoginSources().flatMap(
    ({ profileLabel, designerName, designerId, customers, password }) =>
      customers.map((customer, index) => {
        const haystack = [
          customer.name,
          customer.email,
          customer.id,
          profileLabel,
          designerName,
          designerId,
          '가입고객',
          '데모',
          '베타',
          '누적',
          '증원',
        ]
          .join(' ')
          .toLowerCase();

        return {
          id: customer.id,
          group: '가입고객',
          roleLabel: '고객',
          loginLabel: customer.name ?? customer.email,
          email: customer.email,
          password,
          meta: `${designerName} · ${profileLabel} · ${index + 1}/${customers.length}`,
          accent: colors.coral,
          searchHaystack: haystack,
        };
      }),
  );
}

let registeredCustomerAccountsCache: DemoLoginAccount[] | null = null;

export function getRegisteredCustomerLoginAccounts(): DemoLoginAccount[] {
  if (!registeredCustomerAccountsCache) {
    registeredCustomerAccountsCache = buildRegisteredCustomerLoginAccounts();
  }

  return registeredCustomerAccountsCache;
}

const STATIC_DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  ...BASIC_ACCOUNTS,
  ...ADMIN_LOGIN_ACCOUNTS,
  ...STORE_LOGIN_ACCOUNTS,
  ...ALL_DESIGNER_LOGIN_ACCOUNTS,
];

export function getDemoLoginGroups(options?: { includeRegisteredCustomers?: boolean }) {
  const includeRegisteredCustomers = options?.includeRegisteredCustomers ?? false;

  return DEMO_LOGIN_GROUP_ORDER.map((title) => ({
    title,
    description: DEMO_LOGIN_GROUP_DESCRIPTIONS[title],
    accounts:
      title === '가입고객'
        ? includeRegisteredCustomers
          ? getRegisteredCustomerLoginAccounts()
          : []
        : STATIC_DEMO_LOGIN_ACCOUNTS.filter((account) => account.group === title),
  }));
}

/** @deprecated getDemoLoginGroups() 사용 — 가입고객 행은 첫 접근 시 생성 */
export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  ...STATIC_DEMO_LOGIN_ACCOUNTS,
];

/** @deprecated getDemoLoginGroups() 사용 */
export const DEMO_LOGIN_GROUPS = DEMO_LOGIN_GROUP_ORDER.map((title) => ({
  title,
  description: DEMO_LOGIN_GROUP_DESCRIPTIONS[title],
  accounts: STATIC_DEMO_LOGIN_ACCOUNTS.filter((account) => account.group === title),
}));
