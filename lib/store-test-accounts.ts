import type { UserRole } from './auth';
import type { BetaTestAccount } from './beta-test-accounts';
import {
  NATIONWIDE_STORE_COUNT,
  NATIONWIDE_STORE_DEFINITIONS,
} from './nationwide-org-catalog';

export const STORE_TEST_PASSWORD = 'store1234';

export type StoreTestAccount = BetaTestAccount & {
  linkedOrgStoreId: string;
};

function buildNationwideStoreAccount(storeIndex: number): StoreTestAccount {
  const store = NATIONWIDE_STORE_DEFINITIONS[storeIndex - 1];

  return {
    id: `store-test-nw-${String(storeIndex).padStart(4, '0')}`,
    email: `store-nw-${String(storeIndex).padStart(4, '0')}@hair.app`,
    name: store?.name ?? `플랜비 ${storeIndex}`,
    password: STORE_TEST_PASSWORD,
    role: 'store' as UserRole,
    linkedOrgStoreId: store?.id ?? `virtual-store-nw-${String(storeIndex).padStart(4, '0')}`,
  };
}

/** 전국 플랜비 매장 로그인 (600곳) */
export const NATIONWIDE_STORE_TEST_ACCOUNTS: StoreTestAccount[] = Array.from(
  { length: NATIONWIDE_STORE_COUNT },
  (_, index) => buildNationwideStoreAccount(index + 1),
);

/** 레거시 강남 매장 (`store@hair.app`) */
export const STORE_TEST_ACCOUNT: StoreTestAccount = {
  id: 'store-test',
  email: 'store@hair.app',
  name: '강남 플랜비',
  password: STORE_TEST_PASSWORD,
  role: 'store' as UserRole,
  linkedOrgStoreId: 'virtual-store-nw-0001',
};

/** 시드·로그인에 쓰는 전체 매장 계정 (레거시 + 전국 600) */
export const STORE_TEST_ACCOUNTS: StoreTestAccount[] = [
  STORE_TEST_ACCOUNT,
  ...NATIONWIDE_STORE_TEST_ACCOUNTS.filter((account) => account.id !== 'store-test-nw-0001'),
];

const storeAccountToOrgStoreId = new Map(
  STORE_TEST_ACCOUNTS.map((account) => [account.id, account.linkedOrgStoreId]),
);

const storeEmailToOrgStoreId = new Map(
  STORE_TEST_ACCOUNTS.map((account) => [account.email.toLowerCase(), account.linkedOrgStoreId]),
);

/** 레거시 slug 이메일 → 전국 매장 ID */
const LEGACY_STORE_EMAIL_ALIASES: Record<string, string> = {
  'store-gangnam@hair.app': 'virtual-store-nw-0001',
  'store-hongdae@hair.app': 'virtual-store-nw-0002',
  'store-seongsu@hair.app': 'virtual-store-nw-0003',
  'store-busan@hair.app': 'virtual-store-nw-0004',
};

export function getStoreOrgIdForAccountId(accountId: string) {
  return storeAccountToOrgStoreId.get(accountId);
}

export function getStoreOrgIdForEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  return (
    storeEmailToOrgStoreId.get(normalized) ?? LEGACY_STORE_EMAIL_ALIASES[normalized]
  );
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

/** @deprecated NATIONWIDE_STORE_TEST_ACCOUNTS 사용 */
export const REGIONAL_STORE_TEST_ACCOUNTS = NATIONWIDE_STORE_TEST_ACCOUNTS.slice(0, 4);
