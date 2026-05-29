import type { PaymentRecord } from '../payment-types';
import type { Treatment } from '../treatments';

export type LedgerPayload = {
  treatments: Treatment[];
  payments: PaymentRecord[];
};

export type TreatmentRepository = {
  listForDesigner(designerId: string): Promise<Treatment[]>;
  listForCustomer(customerId: string): Promise<Treatment[]>;
  getById(id: string): Promise<Treatment | null>;
};

export type PaymentRepository = {
  listForDesigner(designerId: string): Promise<PaymentRecord[]>;
  listForCustomer(customerId: string): Promise<PaymentRecord[]>;
  getByTreatmentId(treatmentId: string): Promise<PaymentRecord | null>;
};

/** BFF — 시술+결제 원장 일괄 조회 (Phase B) */
export type LedgerRepository = {
  fetchDesignerLedger(designerId: string, options?: { month?: string }): Promise<LedgerPayload>;
  fetchCustomerLedger(customerId: string): Promise<LedgerPayload>;
};

export type DataSourceMode = 'demo' | 'supabase' | 'rest';
