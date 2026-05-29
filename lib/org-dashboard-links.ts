import type { Href } from 'expo-router';

import type { OrgScope } from './org-access';

export type OrgDashboardListFilter = 'month' | 'escrow';

export function orgCustomersHref(scope: OrgScope, listFilter?: OrgDashboardListFilter): Href {
  const pathname = scope === 'store' ? '/store/customers' : '/admin/customers';

  if (!listFilter) {
    return pathname;
  }

  return { pathname, params: { listFilter } };
}

export function orgRevenuePath(scope: OrgScope) {
  return scope === 'store' ? '/store/revenue' : '/admin/revenue';
}

export function orgSimulationPath(scope: OrgScope) {
  return scope === 'store' ? '/store/simulation' : '/admin/simulation';
}

export function orgDesignersPath(scope: OrgScope) {
  return scope === 'admin' ? '/admin/designers' : '/store';
}
