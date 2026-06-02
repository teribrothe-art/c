import type { UserRole } from './auth';
import type { BetaTestAccount } from './beta-test-accounts';

export const STORE_TEST_PASSWORD = 'store1234';

export type StoreTestAccount = BetaTestAccount & {
  linkedOrgStoreId: string;
};

const HOT_PLACE_STORES = [
  { id: 'virtual-store-hot-gangnam', slug: 'gangnam', name: '강남 플랜비' },
  { id: 'virtual-store-hot-hongdae', slug: 'hongdae', name: '홍대·연남 플랜비' },
  { id: 'virtual-store-hot-seongsu', slug: 'seongsu', name: '성수 플랜비' },
  { id: 'virtual-store-hot-busan', slug: 'busan', name: '해운대·광안리 플랜비' },
] as const;

function buildRegionalStoreAccount(store: (typeof HOT_PLACE_STORES)[number]): StoreTestAccount {
  return {
    id: `store-test-${store.slug}`,
    email: `store-${store.slug}@hair.app`,
    name: store.name,
    password: STORE_TEST_PASSWORD,
    role: 'store' as UserRole,
    linkedOrgStoreId: store.id,
  };
}

/** 지역별 플랜비 매장 로그인 (4곳) */
export const REGIONAL_STORE_TEST_ACCOUNTS: StoreTestAccount[] = HOT_PLACE_STORES.map(
  buildRegionalStoreAccount,
);

/** 레거시 강남 매장 (`store@hair.app`) */
export const STORE_TEST_ACCOUNT: StoreTestAccount = {
  id: 'store-test',
  email: 'store@hair.app',
  name: '강남 플랜비',
  password: STORE_TEST_PASSWORD,
  role: 'store' as UserRole,
  linkedOrgStoreId: 'virtual-store-hot-gangnam',
};

/** 시드·로그인에 쓰는 전체 매장 계정 (레거시 + 지역 4) */
export const STORE_TEST_ACCOUNTS: StoreTestAccount[] = [
  STORE_TEST_ACCOUNT,
  ...REGIONAL_STORE_TEST_ACCOUNTS,
];

const storeAccountToOrgStoreId = new Map(
  STORE_TEST_ACCOUNTS.map((account) => [account.id, account.linkedOrgStoreId]),
);

const storeEmailToOrgStoreId = new Map(
  STORE_TEST_ACCOUNTS.map((account) => [account.email.toLowerCase(), account.linkedOrgStoreId]),
);

export function getStoreOrgIdForAccountId(accountId: string) {
  return storeAccountToOrgStoreId.get(accountId);
}

export function getStoreOrgIdForEmail(email: string) {
  return storeEmailToOrgStoreId.get(email.trim().toLowerCase());
}

export function resolveStoreOrgIdForUser(user: {
  id: string;
  role?: string | null;
  email?: string;
}) {
  if (user.role !== 'store') {
    return undefined;
  }

  return (
    getStoreOrgIdForAccountId(user.id) ??
    (user.email ? getStoreOrgIdForEmail(user.email) : undefined)
  );
}

export const STORE_TEST_PUBLIC = {
  id: STORE_TEST_ACCOUNT.id,
  email: STORE_TEST_ACCOUNT.email,
  password: STORE_TEST_ACCOUNT.password,
  loginLabel: '강남 플랜비 (store@)',
} as const;
