import { getTreatmentById, getDesignerTreatments, getTreatments } from '../../treatments';
import type { TreatmentRepository } from '../types';

export const localTreatmentRepository: TreatmentRepository = {
  async listForDesigner(_designerId) {
    const { treatments } = await getDesignerTreatments();
    return treatments;
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
