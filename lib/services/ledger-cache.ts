import type { DesignerLedger } from './designer-ledger-service';

const DESIGNER_LEDGER_TTL_MS = 45_000;

type CacheEntry = {
  ledger: DesignerLedger;
  expiresAt: number;
};

const designerLedgerCache = new Map<string, CacheEntry>();

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
    expiresAt: Date.now() + DESIGNER_LEDGER_TTL_MS,
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
