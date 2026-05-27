import { getCurrentUser, isDemoAuthMode } from '../auth';
import {
  buildTreatmentLedgerEntries,
  indexPaymentsByTreatmentId,
  type TreatmentLedgerEntry,
} from '../domain/treatment-ledger';
import { toAppError } from '../errors';
import {
  getCustomerDemoPayments,
  getPaymentByTreatmentId,
  type PaymentRecord,
} from '../payment-record';
import { supabase } from '../supabase';
import { getTreatments, type Treatment } from '../treatments';
import { getCachedCustomerLedger, setCachedCustomerLedger } from './ledger-cache';

export type CustomerLedger = {
  customerId: string;
  treatments: Treatment[];
  payments: PaymentRecord[];
  treatmentMap: Map<string, Treatment>;
  paymentsByTreatmentId: Map<string, PaymentRecord>;
  entries: TreatmentLedgerEntry[];
};

export async function loadCustomerPaymentsForCustomer(
  customerId: string,
  treatments: Pick<Treatment, 'id'>[],
): Promise<PaymentRecord[]> {
  if (isDemoAuthMode || !supabase) {
    let payments = await getCustomerDemoPayments(customerId);

    if (payments.length === 0 && treatments.length > 0) {
      const records: PaymentRecord[] = [];

      for (const treatment of treatments) {
        const payment = await getPaymentByTreatmentId(treatment.id);

        if (payment && payment.customer_id === customerId) {
          records.push(payment);
        }
      }

      payments = records;
    }

    return payments;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error);
  }

  return (data ?? []) as PaymentRecord[];
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

  const { treatments } = await getTreatments();
  const payments = await loadCustomerPaymentsForCustomer(user.id, treatments);
  const paymentsByTreatmentId = indexPaymentsByTreatmentId(payments);
  const entries = buildTreatmentLedgerEntries(treatments, paymentsByTreatmentId);

  const ledger: CustomerLedger = {
    customerId: user.id,
    treatments,
    payments,
    treatmentMap: new Map(treatments.map((treatment) => [treatment.id, treatment])),
    paymentsByTreatmentId,
    entries,
  };

  setCachedCustomerLedger(user.id, ledger);

  return ledger;
}
