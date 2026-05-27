import {
  buildTreatmentLedgerEntries,
  indexPaymentsByTreatmentId,
  type TreatmentLedgerEntry,
} from '../domain/treatment-ledger';
import { getCurrentUser } from '../auth';
import { getLedgerRepository } from '../repositories';
import type { PaymentRecord } from '../payment-types';
import type { Treatment } from '../treatments';
import { getCachedCustomerLedger, setCachedCustomerLedger } from './ledger-cache';

export type CustomerLedger = {
  customerId: string;
  treatments: Treatment[];
  payments: PaymentRecord[];
  treatmentMap: Map<string, Treatment>;
  paymentsByTreatmentId: Map<string, PaymentRecord>;
  entries: TreatmentLedgerEntry[];
};

function buildCustomerLedger(customerId: string, treatments: Treatment[], payments: PaymentRecord[]) {
  const paymentsByTreatmentId = indexPaymentsByTreatmentId(payments);
  const entries = buildTreatmentLedgerEntries(treatments, paymentsByTreatmentId);

  return {
    customerId,
    treatments,
    payments,
    treatmentMap: new Map(treatments.map((treatment) => [treatment.id, treatment])),
    paymentsByTreatmentId,
    entries,
  };
}

export async function fetchCustomerLedger(options?: {
  forceRefresh?: boolean;
}): Promise<CustomerLedger | null> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    return null;
  }

  if (!options?.forceRefresh) {
    const cached = getCachedCustomerLedger(user.id);

    if (cached) {
      return cached;
    }
  }

  const ledgerRepo = getLedgerRepository();
  const { treatments, payments } = await ledgerRepo.fetchCustomerLedger(user.id);
  const ledger = buildCustomerLedger(user.id, treatments, payments);

  setCachedCustomerLedger(user.id, ledger);

  return ledger;
}

/** @deprecated fetchCustomerLedger 사용 */
export async function loadCustomerPaymentsForCustomer(
  customerId: string,
  treatments: Pick<Treatment, 'id'>[],
): Promise<PaymentRecord[]> {
  const { getPaymentRepository } = await import('../repositories');
  const payments = await getPaymentRepository().listForCustomer(customerId);

  if (payments.length > 0 || treatments.length === 0) {
    return payments;
  }

  const records = await Promise.all(
    treatments.map((treatment) => getPaymentRepository().getByTreatmentId(treatment.id)),
  );

  return records.filter(
    (payment): payment is PaymentRecord =>
      payment !== null && payment.customer_id === customerId,
  );
}
