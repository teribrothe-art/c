import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import { getLegacyAccumulatedCustomers } from './demo-legacy-accumulated-customers';
import { getBetaDesignerCustomers, isBetaProfileKey } from './demo-beta-designer-profiles';
import { getFleetDesignerCustomers, isFleetProfileKey } from './demo-fleet-100-designers';

/** 프로필에 연결된 고객 수 (증원 디자이너는 배열 없이 customerCount만 보유) */
export function getAccumulatedProfileCustomerCount(config: AccumulatedSeedProfileConfig) {
  if (typeof config.customerCount === 'number') {
    return config.customerCount;
  }

  return config.customers.length;
}

/** 시드·관계용 — 해당 프로필 고객 목록 (증원은 첫 접근 시 생성) */
export function resolveAccumulatedProfileCustomers(
  config: AccumulatedSeedProfileConfig,
): BetaTestAccount[] {
  if (config.customers.length > 0) {
    return config.customers;
  }

  if (isFleetProfileKey(config.key)) {
    return getFleetDesignerCustomers(config.key);
  }

  if (isBetaProfileKey(config.key)) {
    return getBetaDesignerCustomers(config.key);
  }

  return getLegacyAccumulatedCustomers(config.key);
}
