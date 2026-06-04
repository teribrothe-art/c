import { ADMIN_TEST_ACCOUNT } from './admin-test-accounts';
import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC, ACCUMULATED_TEST_PASSWORD } from './demo-accumulated-test-accounts';
import { getAccumulatedTestProfileConfigs } from './demo-accumulated-test-accounts';
import { EXPANDED_STORE_DESIGNERS_PUBLIC } from './demo-expanded-store-designers';
import { SEO_JUNGHYUN_TEST_ACCOUNT } from './demo-customer-seo-junghyun';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';
import type { UserRole } from './auth';

export type DemoCatalogUser = {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
};

let catalogByEmail: Map<string, DemoCatalogUser> | null = null;
let extendedCatalogLoaded = false;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function addAccountToCatalog(map: Map<string, DemoCatalogUser>, account: {
  id: string;
  email: string;
  name?: string | null;
  password: string;
  role: UserRole;
}) {
  map.set(normalizeEmail(account.email), {
    id: account.id,
    email: account.email,
    name: account.name ?? null,
    password: account.password,
    role: account.role,
  });
}

/** 로그인 화면·일반 데모 — 가벼운 코어만 즉시 로드 */
function ensureCoreDemoUserCatalog() {
  if (catalogByEmail) {
    return catalogByEmail;
  }

  catalogByEmail = new Map<string, DemoCatalogUser>();

  addAccountToCatalog(catalogByEmail, ADMIN_TEST_ACCOUNT);

  for (const account of STORE_TEST_ACCOUNTS) {
    addAccountToCatalog(catalogByEmail, account);
  }

  for (const account of BETA_DESIGNERS) {
    addAccountToCatalog(catalogByEmail, account);
  }

  for (const account of BETA_CUSTOMERS) {
    addAccountToCatalog(catalogByEmail, account);
  }

  addAccountToCatalog(catalogByEmail, SEO_JUNGHYUN_TEST_ACCOUNT);

  for (const designer of ACCUMULATED_TEST_DESIGNERS_PUBLIC) {
    addAccountToCatalog(catalogByEmail, {
      id: designer.id,
      email: designer.email,
      name: designer.name,
      password: ACCUMULATED_TEST_PASSWORD,
      role: 'designer',
    });
  }

  for (const designer of EXPANDED_STORE_DESIGNERS_PUBLIC) {
    addAccountToCatalog(catalogByEmail, {
      id: designer.id,
      email: designer.email,
      name: designer.name,
      password: designer.password,
      role: 'designer',
    });
  }

  return catalogByEmail;
}

/** 테스트 계정(누적 고객 등) — 첫 조회 시에만 대량 배열 생성 */
function ensureExtendedDemoUserCatalog() {
  const map = ensureCoreDemoUserCatalog();

  if (extendedCatalogLoaded) {
    return map;
  }

  for (const config of getAccumulatedTestProfileConfigs()) {
    addAccountToCatalog(map, config.designer);

    for (const customer of config.customers) {
      addAccountToCatalog(map, customer);
    }
  }

  extendedCatalogLoaded = true;
  return map;
}

/** 테스트 계정 카탈로그에서 이메일·비밀번호로 조회 */
export function lookupDemoCatalogUser(email: string, password: string): DemoCatalogUser | null {
  const normalized = normalizeEmail(email);
  let user = ensureCoreDemoUserCatalog().get(normalized) ?? null;

  if (!user) {
    user = ensureExtendedDemoUserCatalog().get(normalized) ?? null;
  }

  if (!user || user.password !== password) {
    return null;
  }

  return user;
}
