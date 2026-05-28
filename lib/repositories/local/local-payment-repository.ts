import {
  getCustomerDemoPayments,
  getDesignerDemoPayments,
  getPaymentByTreatmentId,
} from '../../payment-record';
import { isDemoAuthMode } from '../../auth';
import { toAppError } from '../../errors';
import { supabase } from '../../supabase';
import type { PaymentRecord } from '../../payment-types';
import type { PaymentRepository } from '../types';

export const localPaymentRepository: PaymentRepository = {
  async listForDesigner(designerId) {
    if (isDemoAuthMode || !supabase) {
      return getDesignerDemoPayments(designerId);
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('designer_id', designerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw toAppError(error);
    }

    return (data ?? []) as PaymentRecord[];
  },

  async listForCustomer(customerId) {
    if (isDemoAuthMode || !supabase) {
      return getCustomerDemoPayments(customerId);
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
  },

  async getByTreatmentId(treatmentId) {
    return getPaymentByTreatmentId(treatmentId);
  },
};
