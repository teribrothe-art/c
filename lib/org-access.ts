import type { UserRole } from './auth';
import { findOrgDesigner, type OrgDesignerRosterEntry } from './org-designer-roster';

export type OrgScope = 'store' | 'admin';

export function orgScopeForRole(role: UserRole | null | undefined): OrgScope | null {
  if (role === 'store') {
    return 'store';
  }

  if (role === 'admin') {
    return 'admin';
  }

  return null;
}

export function canViewOrgDesignerData(role: UserRole | null | undefined) {
  return role === 'store' || role === 'admin';
}

export function resolveOrgDesignerAccess(
  role: UserRole | null | undefined,
  designerId: string,
  storeOrgId?: string,
): { scope: OrgScope; designer: OrgDesignerRosterEntry } | null {
  const scope = orgScopeForRole(role);

  if (!scope) {
    return null;
  }

  const designer = findOrgDesigner(scope, designerId, scope === 'store' ? storeOrgId : undefined);

  if (!designer) {
    return null;
  }

  return { scope, designer };
}
