import type { DemoLoginAccount } from './demo-login-accounts';
import {
  DESIGNER_REGION_FILTER_TABS,
  formatDesignerRegionShortLabel,
  type DesignerRegionFilterKey,
} from './designer-region-filter';
import { getNationwideStoreById } from './nationwide-org-catalog';
import { getOrgStoreById } from './org-store-affiliation';
import { getStoreOrgIdForAccountId } from './store-test-accounts';

export const STORE_LOGIN_REGION_TABS = DESIGNER_REGION_FILTER_TABS;

export function resolveStoreLoginRegionKey(account: DemoLoginAccount): string {
  const storeId = getStoreOrgIdForAccountId(account.id);
  const store =
    (storeId ? getOrgStoreById(storeId) : undefined) ??
    (storeId ? getNationwideStoreById(storeId) : undefined);
  const regionFromMeta = account.meta?.split(' · ')[0]?.trim();

  return formatDesignerRegionShortLabel(store?.region ?? regionFromMeta ?? '');
}

export function storeLoginAccountMatchesRegion(
  account: DemoLoginAccount,
  regionKey: DesignerRegionFilterKey,
) {
  if (regionKey === 'all') {
    return true;
  }

  return resolveStoreLoginRegionKey(account) === regionKey;
}

export function filterStoreLoginAccountsByRegion(
  accounts: DemoLoginAccount[],
  regionKey: DesignerRegionFilterKey,
) {
  if (regionKey === 'all') {
    return accounts;
  }

  return accounts.filter((account) => storeLoginAccountMatchesRegion(account, regionKey));
}
