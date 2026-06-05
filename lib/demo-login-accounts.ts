import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { getBootstrapDemoLoginGroups } from './demo-login-static-groups';
import { getDesignerLoginAccounts } from './demo-login-designer-accounts';
import { searchLinkedCustomerLoginAccounts } from './demo-login-linked-customer-search';
import { ORG_STORE_DEFINITIONS } from './org-store-affiliation';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';
import type { DemoLoginAccount } from './demo-login-account-types';

export type { DemoLoginAccount } from './demo-login-account-types';

import {
  DEMO_LOGIN_GROUP_DESCRIPTIONS,
  DEMO_LOGIN_GROUP_ORDER,
  demoLoginGroupListsAllWhenExpanded,
  getDemoLoginSearchPlaceholder,
  isCollapsibleDemoLoginGroup,
  isSearchableDemoLoginGroup,
  type DemoLoginGroupKey,
} from './demo-login-groups-meta';

export {
  DEMO_LOGIN_COLLAPSIBLE_GROUPS,
  DEMO_LOGIN_GROUP_DESCRIPTIONS,
  DEMO_LOGIN_GROUP_ORDER,
  demoLoginGroupListsAllWhenExpanded,
  getDemoLoginSearchPlaceholder,
  isCollapsibleDemoLoginGroup,
  isSearchableDemoLoginGroup,
  type DemoLoginGroupKey,
} from './demo-login-groups-meta';

export {
  DESIGNER_LOGIN_COUNT,
  getDesignerLoginAccounts,
  prewarmDesignerLoginAccounts,
} from './demo-login-designer-accounts';

export { searchLinkedCustomerLoginAccounts } from './demo-login-linked-customer-search';

export {
  ACCUMULATED_LOGIN_CUSTOMER_COUNT,
  getDemoLoginGroupCountLabel,
} from './demo-login-groups-meta';

/** @deprecated getDesignerLoginAccounts() 사용 */
export const ALL_DESIGNER_LOGIN_ACCOUNTS: DemoLoginAccount[] = [];

function storeSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

const STORE_LOGIN_ACCOUNTS: DemoLoginAccount[] = STORE_TEST_ACCOUNTS.map((account) => {
  const orgStore = ORG_STORE_DEFINITIONS.find((store) => store.id === account.linkedOrgStoreId);
  const designerCount = orgStore?.designerIds.length ?? 0;
  const isLegacy = account.id === 'store-test';

  return {
    id: account.id,
    group: '매장',
    roleLabel: isLegacy ? '레거시' : '매장',
    loginLabel: isLegacy ? `${orgStore?.name ?? account.name} (store@)` : (orgStore?.name ?? account.name),
    email: account.email,
    password: account.password,
    meta: orgStore
      ? `${orgStore.region} · ${orgStore.hotPlace} · 디자이너 ${designerCount}명`
      : undefined,
    accent: '#0284C7',
    searchHaystack: storeSearchHaystack([
      '매장',
      account.name,
      account.email,
      account.id,
      orgStore?.name ?? '',
      orgStore?.region ?? '',
      orgStore?.hotPlace ?? '',
      isLegacy ? 'store@ 레거시' : '',
    ]),
  };
});

export const STORE_LOGIN_COUNT = STORE_LOGIN_ACCOUNTS.length;

const ADMIN_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  {
    id: ADMIN_TEST_PUBLIC.id,
    group: '본사',
    roleLabel: '본사',
    loginLabel: ADMIN_TEST_PUBLIC.loginLabel,
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    meta: '전체 플랜비 · 디자이너 · 매출',
    accent: '#4B5563',
    searchHaystack: ['본사', '어드민', 'admin', ADMIN_TEST_PUBLIC.email, 'hq-admin']
      .join(' ')
      .toLowerCase(),
  },
];

/** @deprecated searchLinkedCustomerLoginAccounts() 사용 */
export function getRegisteredCustomerLoginAccounts(): DemoLoginAccount[] {
  return searchLinkedCustomerLoginAccounts('').accounts;
}

export function getDemoLoginAccountsForGroup(title: DemoLoginGroupKey): DemoLoginAccount[] {
  switch (title) {
    case '본사':
      return ADMIN_LOGIN_ACCOUNTS;
    case '매장':
      return STORE_LOGIN_ACCOUNTS;
    case '디자이너':
      return [];
    case '가입고객':
      return [];
    default:
      return [];
  }
}

export function getDemoLoginGroups() {
  return getBootstrapDemoLoginGroups().map((group) =>
    group.title === '디자이너'
      ? { ...group, accounts: getDesignerLoginAccounts() }
      : group,
  );
}

/** @deprecated getDemoLoginGroups() 사용 */
export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  ...ADMIN_LOGIN_ACCOUNTS,
  ...STORE_LOGIN_ACCOUNTS,
];

/** @deprecated getDemoLoginGroups() 사용 */
export const DEMO_LOGIN_GROUPS = DEMO_LOGIN_GROUP_ORDER.map((title) => ({
  title,
  description: DEMO_LOGIN_GROUP_DESCRIPTIONS[title],
  accounts: getDemoLoginAccountsForGroup(title),
}));
