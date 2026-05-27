import { isDemoAuthMode } from '../auth';
import { isRestApiMode } from '../api/config';
import { localLedgerRepository } from './local/local-ledger-repository';
import { localPaymentRepository } from './local/local-payment-repository';
import { localTreatmentRepository } from './local/local-treatment-repository';
import { restLedgerRepository } from './rest/rest-ledger-repository';
import { restPaymentRepository } from './rest/rest-payment-repository';
import { restTreatmentRepository } from './rest/rest-treatment-repository';
import type {
  DataSourceMode,
  LedgerRepository,
  PaymentRepository,
  TreatmentRepository,
} from './types';

export type {
  DataSourceMode,
  LedgerPayload,
  LedgerRepository,
  PaymentRepository,
  TreatmentRepository,
} from './types';

export function getDataSourceMode(): DataSourceMode {
  if (isDemoAuthMode) {
    return 'demo';
  }

  if (isRestApiMode()) {
    return 'rest';
  }

  return 'supabase';
}

export function getTreatmentRepository(): TreatmentRepository {
  return getDataSourceMode() === 'rest' ? restTreatmentRepository : localTreatmentRepository;
}

export function getPaymentRepository(): PaymentRepository {
  return getDataSourceMode() === 'rest' ? restPaymentRepository : localPaymentRepository;
}

export function getLedgerRepository(): LedgerRepository {
  return getDataSourceMode() === 'rest' ? restLedgerRepository : localLedgerRepository;
}
