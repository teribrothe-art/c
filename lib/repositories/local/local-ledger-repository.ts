import type { LedgerRepository } from '../types';
import { localPaymentRepository } from './local-payment-repository';
import { localTreatmentRepository } from './local-treatment-repository';

export const localLedgerRepository: LedgerRepository = {
  async fetchDesignerLedger(designerId, options) {
    const treatments = await localTreatmentRepository.listForDesigner(designerId);
    let payments = await localPaymentRepository.listForDesigner(designerId);

    if (payments.length === 0 && treatments.length > 0) {
      const records = await Promise.all(
        treatments.map((treatment) => localPaymentRepository.getByTreatmentId(treatment.id)),
      );

      payments = records.filter(
        (payment): payment is NonNullable<typeof payment> =>
          payment !== null && payment.designer_id === designerId,
      );
    }

    if (options?.month) {
      const month = options.month;

      return {
        treatments: treatments.filter((t) => t.treatment_date.slice(0, 7) === month),
        payments: payments.filter((p) => {
          const date = (p.settled_at ?? p.paid_at ?? p.created_at).slice(0, 7);
          return date === month;
        }),
      };
    }

    return { treatments, payments };
  },

  async fetchCustomerLedger(customerId) {
    const treatments = await localTreatmentRepository.listForCustomer(customerId);
    let payments = await localPaymentRepository.listForCustomer(customerId);

    if (payments.length === 0 && treatments.length > 0) {
      const records = await Promise.all(
        treatments.map((treatment) => localPaymentRepository.getByTreatmentId(treatment.id)),
      );

      payments = records.filter(
        (payment): payment is NonNullable<typeof payment> =>
          payment !== null && payment.customer_id === customerId,
      );
    }

    return { treatments, payments };
  },
};
