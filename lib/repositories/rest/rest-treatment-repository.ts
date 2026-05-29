import { apiRequest } from '../../api/http-client';
import type { Treatment } from '../../treatments';
import type { TreatmentRepository } from '../types';

export const restTreatmentRepository: TreatmentRepository = {
  async listForDesigner(_designerId) {
    const data = await apiRequest<{ treatments: Treatment[] }>('/v1/designer/treatments');
    return data.treatments ?? [];
  },

  async listForCustomer(_customerId) {
    const data = await apiRequest<{ treatments: Treatment[] }>('/v1/customer/treatments');
    return data.treatments ?? [];
  },

  async getById(id) {
    try {
      const data = await apiRequest<{ treatment: Treatment | null }>(`/v1/treatments/${id}`);
      return data.treatment ?? null;
    } catch {
      return null;
    }
  },
};
