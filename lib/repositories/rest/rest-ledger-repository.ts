import { apiRequest } from '../../api/http-client';
import type { PaymentRecord } from '../../payment-types';
import type { Treatment } from '../../treatments';
import type { LedgerPayload, LedgerRepository } from '../types';

type LedgerResponseDto = {
  treatments: Treatment[];
  payments: PaymentRecord[];
};

export const restLedgerRepository: LedgerRepository = {
  async fetchDesignerLedger(_designerId, options) {
    const data = await apiRequest<LedgerResponseDto>('/v1/designer/ledger', {
      query: { month: options?.month },
    });

    return normalizeLedgerPayload(data);
  },

  async fetchCustomerLedger(_customerId) {
    const data = await apiRequest<LedgerResponseDto>('/v1/customer/ledger');

    return normalizeLedgerPayload(data);
  },
};

function normalizeLedgerPayload(data: LedgerResponseDto): LedgerPayload {
  return {
    treatments: data.treatments ?? [],
    payments: data.payments ?? [],
  };
}
