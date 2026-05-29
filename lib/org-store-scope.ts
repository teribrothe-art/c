import { getCurrentUser } from './auth';
import type { OrgScope } from './org-access';
import { STORE_SCOPE_STORE_ID } from './org-store-affiliation';
import { resolveStoreOrgIdForUser } from './store-test-accounts';

/** 로그인한 매장 계정의 조직 매장 ID (미로그인·비매장이면 강남 기본) */
export async function resolveCurrentStoreOrgId() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'store') {
    return STORE_SCOPE_STORE_ID;
  }

  return resolveStoreOrgIdForUser(user) ?? STORE_SCOPE_STORE_ID;
}

export async function resolveStoreOrgIdForOrgScope(
  scope: OrgScope,
  explicitStoreId?: string,
) {
  if (scope !== 'store') {
    return undefined;
  }

  if (explicitStoreId) {
    return explicitStoreId;
  }

  return resolveCurrentStoreOrgId();
}
