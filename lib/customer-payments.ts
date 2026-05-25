import { fetchCustomerPaymentEntries } from './customer-payment-entries';
import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { getPaymentByTreatmentId, PaymentRecord, PaymentRecordStatus } from './payment-record';
import { supabase } from './supabase';
import { getTreatments, Treatment } from './treatments';

export type CustomerPaymentListItem = {
  payment: PaymentRecord;
  treatment: Treatment;
  badgeLabel: string;
  badgeVariant: 'paid' | 'waiting' | 'done';
};

function getCustomerPaymentBadge(
  paymentStatus: PaymentRecordStatus,
  treatmentStatus?: string | null,
): { label: string; variant: 'paid' | 'waiting' | 'done' } {
  if (paymentStatus === 'completed' || treatmentStatus === 'completed') {
    return { label: '완료', variant: 'done' };
  }

  if (paymentStatus === 'paid') {
    return { label: '피드백 대기', variant: 'waiting' };
  }

  if (paymentStatus === 'pending' || paymentStatus === 'refunded') {
    return { label: '결제 대기', variant: 'waiting' };
  }

  return { label: '결제 완료', variant: 'paid' };
}

export async function fetchCustomerPaymentHistory(): Promise<CustomerPaymentListItem[]> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    return [];
  }

  if (isDemoAuthMode || !supabase) {
    const entries = await fetchCustomerPaymentEntries();

    return entries
      .filter((entry) => entry.payment)
      .map((entry) => {
        const payment = entry.payment!;
        const badge = getCustomerPaymentBadge(payment.status, entry.treatment.payment_status);

        return {
          payment,
          treatment: entry.treatment,
          badgeLabel: badge.label,
          badgeVariant: badge.variant,
        };
      });
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error);
  }

  const payments = (data ?? []) as PaymentRecord[];
  const { treatments } = await getTreatments();
  const treatmentMap = new Map(treatments.map((t) => [t.id, t]));

  return payments
    .map((payment) => {
      const treatment = treatmentMap.get(payment.treatment_id);

      if (!treatment) {
        return null;
      }

      const badge = getCustomerPaymentBadge(payment.status, treatment.payment_status);
      return { payment, treatment, badgeLabel: badge.label, badgeVariant: badge.variant };
    })
    .filter((item): item is CustomerPaymentListItem => item !== null);
}

function normalizeNeedsPayment(treatment: Treatment) {
  return (
    treatment.payment_status === 'payment_requested' ||
    treatment.payment_status === 'escrow' ||
    treatment.payment_status === 'completed'
  );
}
