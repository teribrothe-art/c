import { apiRequest } from '../../api/http-client';
import type { PaymentRecord } from '../../payment-types';
import type { PaymentRepository } from '../types';

export const restPaymentRepository: PaymentRepository = {
  async listForDesigner(_designerId) {
    const data = await apiRequest<{ payments: PaymentRecord[] }>('/v1/designer/payments');
    return data.payments ?? [];
  },

  async listForCustomer(_customerId) {
    const data = await apiRequest<{ payments: PaymentRecord[] }>('/v1/customer/payments');
    return data.payments ?? [];
  },

  async getByTreatmentId(treatmentId) {
    try {
      const data = await apiRequest<{ payment: PaymentRecord | null }>(
        `/v1/payments/by-treatment/${treatmentId}`,
      );
      return data.payment ?? null;
    } catch {
      return null;
    }
  },
};
