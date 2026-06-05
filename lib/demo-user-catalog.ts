import {
  getDemoCatalogLightweightAccounts,
  resolveDemoCatalogUserByEmail,
} from './demo-catalog-accounts';
import type { UserRole } from './user-role';

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

  for (const account of getDemoCatalogLightweightAccounts()) {
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
  const normalized = normalizeEmail(email);

  const resolved = resolveDemoCatalogUserByEmail(normalized, password);

  if (resolved) {
    return {
      id: resolved.id,
      email: resolved.email,
      name: resolved.name,
      password: resolved.password,
      role: resolved.role,
    };
  }

  const user = ensureDemoUserCatalog().get(normalized);

  if (user && user.password === password) {
    return user;
  }

  return null;
}
