import type { CustomerLedger } from './customer-ledger-service';
import type { DesignerLedger } from './designer-ledger-service';

const LEDGER_TTL_MS = 45_000;

type CacheEntry<T> = {
  ledger: T;
  expiresAt: number;
};

const designerLedgerCache = new Map<string, CacheEntry<DesignerLedger>>();
const customerLedgerCache = new Map<string, CacheEntry<CustomerLedger>>();

export function getCachedDesignerLedger(designerId: string): DesignerLedger | null {
  const entry = designerLedgerCache.get(designerId);

  if (!entry || entry.expiresAt <= Date.now()) {
    designerLedgerCache.delete(designerId);
    return null;
  }

  return entry.ledger;
}

export function setCachedDesignerLedger(designerId: string, ledger: DesignerLedger) {
  designerLedgerCache.set(designerId, {
    ledger,
    expiresAt: Date.now() + LEDGER_TTL_MS,
  });
}

export function getCachedCustomerLedger(customerId: string): CustomerLedger | null {
  const entry = customerLedgerCache.get(customerId);

  if (!entry || entry.expiresAt <= Date.now()) {
    customerLedgerCache.delete(customerId);
    return null;
  }

  return entry.ledger;
}

export function setCachedCustomerLedger(customerId: string, ledger: CustomerLedger) {
  customerLedgerCache.set(customerId, {
    ledger,
    expiresAt: Date.now() + LEDGER_TTL_MS,
  });
}

/** 결제·정산·시술 수정 후 화면 간 데이터를 맞추기 위해 호출 */
export function invalidateDesignerLedgerCache(designerId?: string) {
  if (designerId) {
    designerLedgerCache.delete(designerId);
    return;
  }

  designerLedgerCache.clear();
}

export function invalidateCustomerLedgerCache(customerId?: string) {
  if (customerId) {
    customerLedgerCache.delete(customerId);
    return;
  }

  customerLedgerCache.clear();
}

export function invalidateAllLedgerCaches() {
  designerLedgerCache.clear();
  customerLedgerCache.clear();
}
