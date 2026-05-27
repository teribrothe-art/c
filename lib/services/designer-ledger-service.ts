import {
  buildTreatmentLedgerEntries,
  indexPaymentsByTreatmentId,
  type TreatmentLedgerEntry,
} from '../domain/treatment-ledger';
import { getLedgerRepository } from '../repositories';
import type { PaymentRecord } from '../payment-types';
import type { Treatment } from '../treatments';
import { getCachedDesignerLedger, setCachedDesignerLedger } from './ledger-cache';

export type DesignerLedger = {
  designerId: string;
  treatments: Treatment[];
  payments: PaymentRecord[];
  treatmentMap: Map<string, Treatment>;
  paymentsByTreatmentId: Map<string, PaymentRecord>;
  entries: TreatmentLedgerEntry[];
};

function buildDesignerLedger(designerId: string, treatments: Treatment[], payments: PaymentRecord[]) {
  const paymentsByTreatmentId = indexPaymentsByTreatmentId(payments);
  const entries = buildTreatmentLedgerEntries(treatments, paymentsByTreatmentId);

  return {
    designerId,
    treatments,
    payments,
    treatmentMap: new Map(treatments.map((treatment) => [treatment.id, treatment])),
    paymentsByTreatmentId,
    entries,
  };
}

export async function fetchDesignerLedger(options?: {
  forceRefresh?: boolean;
  month?: string;
}): Promise<DesignerLedger | null> {
  const { getCurrentUser } = await import('../auth');
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return null;
  }

  if (!options?.forceRefresh) {
    const cached = getCachedDesignerLedger(user.id);

    if (cached && !options?.month) {
      return cached;
    }
  }

  const ledgerRepo = getLedgerRepository();
  const { treatments, payments } = await ledgerRepo.fetchDesignerLedger(user.id, {
    month: options?.month,
  });

  const ledger = buildDesignerLedger(user.id, treatments, payments);

  if (!options?.month) {
    setCachedDesignerLedger(user.id, ledger);
  }

  return ledger;
}

/** @deprecated fetchDesignerLedger 사용 */
export async function loadDesignerPaymentsForDesigner(
  designerId: string,
  treatments: Pick<Treatment, 'id'>[],
): Promise<PaymentRecord[]> {
  const { getPaymentRepository } = await import('../repositories');
  const payments = await getPaymentRepository().listForDesigner(designerId);

  if (payments.length > 0 || treatments.length === 0) {
    return payments;
  }

  const records = await Promise.all(
    treatments.map((treatment) => getPaymentRepository().getByTreatmentId(treatment.id)),
  );

  return records.filter(
    (payment): payment is PaymentRecord =>
      payment !== null && payment.designer_id === designerId,
  );
}
