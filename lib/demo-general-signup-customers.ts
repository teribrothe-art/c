import type { BetaTestAccount } from './beta-test-accounts';
import { getDemoCatalogSeedAccounts } from './demo-catalog-accounts';
import { demoGetItem } from './demo-async-storage';

type StoredDemoUser = {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: string;
};

const KNOWN_TEST_CUSTOMER_IDS = new Set(
  getDemoCatalogSeedAccounts()
    .filter((account) => account.role === 'customer')
    .map((account) => account.id),
);

const KNOWN_TEST_CUSTOMER_EMAILS = new Set(
  getDemoCatalogSeedAccounts()
    .filter((account) => account.role === 'customer')
    .map((account) => account.email.trim().toLowerCase()),
);

function isCatalogTestCustomer(user: StoredDemoUser) {
  const email = user.email.trim().toLowerCase();

  if (KNOWN_TEST_CUSTOMER_IDS.has(user.id) || KNOWN_TEST_CUSTOMER_EMAILS.has(email)) {
    return true;
  }

  if (/^test-fleet-\d{3}-customer-/.test(user.id)) {
    return true;
  }

  if (/^test-customer-/.test(user.id) || user.id.startsWith('accum')) {
    return true;
  }

  if (user.id.startsWith('beta-')) {
    return true;
  }

  return false;
}

/** 회원가입 화면으로 가입한 데모 고객 (테스트 시드·증원·누적 제외) */
export function isGeneralSignupDemoCustomer(user: StoredDemoUser) {
  return user.role === 'customer' && !isCatalogTestCustomer(user);
}

let cache: BetaTestAccount[] | null = null;
let loadPromise: Promise<BetaTestAccount[]> | null = null;

function mapStoredUser(user: StoredDemoUser): BetaTestAccount {
  return {
    id: user.id,
    email: user.email.trim().toLowerCase(),
    name: user.name?.trim() || user.email.split('@')[0] || '고객',
    password: user.password,
    role: 'customer',
  };
}

export async function prefetchGeneralSignupCustomers() {
  if (cache) {
    return cache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const raw = await demoGetItem('hair-diary-demo-users');
    const users = raw ? (JSON.parse(raw) as StoredDemoUser[]) : [];

    cache = users.filter(isGeneralSignupDemoCustomer).map(mapStoredUser);
    return cache;
  })();

  return loadPromise;
}

export function getGeneralSignupCustomersSnapshot() {
  return cache ?? [];
}

export function invalidateGeneralSignupCustomersCache() {
  cache = null;
  loadPromise = null;
}

export function getGeneralSignupCustomerCountSnapshot() {
  return getGeneralSignupCustomersSnapshot().length;
}
