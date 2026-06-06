import type { DesignerClientListItem } from './customer-invitations';
import type { DesignerPaymentDashboard } from './designer-payment-stats';
import { isDemoAuthMode } from './demo-auth-mode';
import type { Treatment } from './treatments';

const CACHE_TTL_MS = isDemoAuthMode ? 300_000 : 45_000;

type CacheEntry<T> = {
  at: number;
  value: T;
};

let clientListEntry: CacheEntry<DesignerClientListItem[]> | null = null;
let dashboardEntry: CacheEntry<DesignerPaymentDashboard> | null = null;
const treatmentsCache = new Map<string, CacheEntry<Treatment[]>>();
let orgClientListKey: string | null = null;
let orgClientListEntry: CacheEntry<unknown[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null | undefined) {
  return entry !== null && entry !== undefined && Date.now() - entry.at < CACHE_TTL_MS;
}

export function buildOrgClientListCacheKey(scope: string, storeOrgId?: string) {
  return `${scope}:${storeOrgId ?? 'default'}`;
}

export function peekOrgClientListCache<T>(cacheKey: string): T[] | null {
  if (orgClientListKey !== cacheKey || !isFresh(orgClientListEntry)) {
    return null;
  }

  return orgClientListEntry!.value as T[];
}

export function storeOrgClientListCache<T>(cacheKey: string, value: T[]) {
  orgClientListKey = cacheKey;
  orgClientListEntry = { at: Date.now(), value };
}

export function invalidateDesignerWorkspaceCache() {
  clientListEntry = null;
  dashboardEntry = null;
  treatmentsCache.clear();
  orgClientListKey = null;
  orgClientListEntry = null;
}

export function peekDesignerClientListCache() {
  return isFresh(clientListEntry) ? clientListEntry!.value : null;
}

export function peekDesignerPaymentDashboardCache() {
  return isFresh(dashboardEntry) ? dashboardEntry!.value : null;
}

export function peekDesignerTreatmentsCache(designerId: string) {
  const entry = treatmentsCache.get(designerId);

  return isFresh(entry) ? entry!.value : null;
}

export function storeDesignerClientList(value: DesignerClientListItem[]) {
  clientListEntry = { at: Date.now(), value };
}

export function storeDesignerPaymentDashboard(value: DesignerPaymentDashboard) {
  dashboardEntry = { at: Date.now(), value };
}

export function storeDesignerTreatments(designerId: string, treatments: Treatment[]) {
  treatmentsCache.set(designerId, { at: Date.now(), value: treatments });
}
