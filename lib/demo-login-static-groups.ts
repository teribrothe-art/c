import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_GROUP_DESCRIPTIONS, type DemoLoginGroupKey } from './demo-login-groups-meta';
import { DEMO_LOGIN_STORE_META } from './demo-login-store-meta';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';

function storeSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

type BootstrapLoginAccount = {
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

const ADMIN_LOGIN_ACCOUNTS: BootstrapLoginAccount[] = [
  {
    id: ADMIN_TEST_PUBLIC.id,
    group: '본사',
    roleLabel: '본사',
    loginLabel: ADMIN_TEST_PUBLIC.loginLabel,
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    meta: '전체 플랜비 · 디자이너 · 매출',
    accent: '#4B5563',
    searchHaystack: ['본사', '어드민', 'admin', ADMIN_TEST_PUBLIC.email, 'hq-admin']
      .join(' ')
      .toLowerCase(),
  },
];

const STORE_LOGIN_ACCOUNTS: BootstrapLoginAccount[] = STORE_TEST_ACCOUNTS.map((account) => {
  const orgStore = DEMO_LOGIN_STORE_META[account.linkedOrgStoreId];
  const designerCount = orgStore?.designerCount ?? 0;
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

/** 본사·매장 — 즉시 표시용 (누적/증원 모듈 로드 없음) */
export function getBootstrapDemoLoginGroups(): {
  title: DemoLoginGroupKey;
  description: string;
  accounts: BootstrapLoginAccount[];
}[] {
  return [
    {
      title: '본사',
      description: DEMO_LOGIN_GROUP_DESCRIPTIONS.본사,
      accounts: ADMIN_LOGIN_ACCOUNTS,
    },
    {
      title: '매장',
      description: DEMO_LOGIN_GROUP_DESCRIPTIONS.매장,
      accounts: STORE_LOGIN_ACCOUNTS,
    },
    {
      title: '디자이너',
      description: DEMO_LOGIN_GROUP_DESCRIPTIONS.디자이너,
      accounts: [],
    },
    {
      title: '가입고객',
      description: DEMO_LOGIN_GROUP_DESCRIPTIONS.가입고객,
      accounts: [],
    },
  ];
}
