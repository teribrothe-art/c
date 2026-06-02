import { ADMIN_TEST_ACCOUNT } from './admin-test-accounts';
import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_ACCOUNTS } from './demo-accumulated-test-accounts';
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function ensureDemoUserCatalog() {
  if (catalogByEmail) {
    return catalogByEmail;
  }

  catalogByEmail = new Map<string, DemoCatalogUser>();

  for (const account of [
    ADMIN_TEST_ACCOUNT,
    ...STORE_TEST_ACCOUNTS,
    ...BETA_DESIGNERS,
    ...BETA_CUSTOMERS,
    ...ACCUMULATED_TEST_ACCOUNTS,
    SEO_JUNGHYUN_TEST_ACCOUNT,
  ]) {
    catalogByEmail.set(normalizeEmail(account.email), {
      id: account.id,
      email: account.email,
      name: account.name ?? null,
      password: account.password,
      role: account.role,
    });
  }

  return catalogByEmail;
}

/** 테스트 계정 카탈로그에서 이메일·비밀번호로 조회 (시드 생성 없음) */
export function lookupDemoCatalogUser(email: string, password: string): DemoCatalogUser | null {
  const user = ensureDemoUserCatalog().get(normalizeEmail(email));

  if (!user || user.password !== password) {
    return null;
  }

  return user;
}
