import type { DesignerClientListItem } from './customer-invitations';
import type { DesignerPaymentDashboard } from './designer-payment-stats';
import type { Treatment } from './treatments';

const CACHE_TTL_MS = 45_000;

type CacheEntry<T> = {
  at: number;
  value: T;
};

let clientListEntry: CacheEntry<DesignerClientListItem[]> | null = null;
let dashboardEntry: CacheEntry<DesignerPaymentDashboard> | null = null;
let treatmentsEntry: CacheEntry<{ designerId: string; treatments: Treatment[] }> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null) {
  return entry !== null && Date.now() - entry.at < CACHE_TTL_MS;
}

export function invalidateDesignerWorkspaceCache() {
  clientListEntry = null;
  dashboardEntry = null;
  treatmentsEntry = null;
}

export function peekDesignerClientListCache() {
  return isFresh(clientListEntry) ? clientListEntry!.value : null;
}

export function peekDesignerPaymentDashboardCache() {
  return isFresh(dashboardEntry) ? dashboardEntry!.value : null;
}

export function peekDesignerTreatmentsCache(designerId: string) {
  if (!isFresh(treatmentsEntry) || treatmentsEntry!.value.designerId !== designerId) {
    return null;
  }

  return treatmentsEntry!.value.treatments;
}

export function storeDesignerClientList(value: DesignerClientListItem[]) {
  clientListEntry = { at: Date.now(), value };
}

export function storeDesignerPaymentDashboard(value: DesignerPaymentDashboard) {
  dashboardEntry = { at: Date.now(), value };
}

export function storeDesignerTreatments(designerId: string, treatments: Treatment[]) {
  treatmentsEntry = { at: Date.now(), value: { designerId, treatments } };
}
