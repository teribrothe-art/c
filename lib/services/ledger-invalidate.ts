import type { Treatment } from '../treatments';
import { invalidateCustomerLedgerCache, invalidateDesignerLedgerCache } from './ledger-cache';

export function invalidateLedgerCachesForTreatment(
  treatment: Pick<Treatment, 'customer_id' | 'designer_id'>,
) {
  if (treatment.designer_id) {
    invalidateDesignerLedgerCache(treatment.designer_id);
  }

  if (treatment.customer_id) {
    invalidateCustomerLedgerCache(treatment.customer_id);
  }
}
