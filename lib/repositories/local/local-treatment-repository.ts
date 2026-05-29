import {
  getTreatmentById,
  getTreatments,
  listTreatmentsForDesignerId,
} from '../../treatments';
import type { TreatmentRepository } from '../types';

export const localTreatmentRepository: TreatmentRepository = {
  async listForDesigner(designerId) {
    return listTreatmentsForDesignerId(designerId);
  },

  async listForCustomer(_customerId) {
    const { treatments } = await getTreatments();
    return treatments;
  },

  async getById(id) {
    const { treatment } = await getTreatmentById(id);
    return treatment;
  },
};
