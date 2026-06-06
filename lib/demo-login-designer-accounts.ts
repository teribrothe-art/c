import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import {
  filterDemoDesignersWithCustomers,
  formatDemoDesignerCustomerCount,
  getDemoDesignerCustomerCount,
  INCLUDED_DEMO_TEST_DESIGNER_COUNT,
  isDemoDesignerIncludedInTestAccounts,
} from './demo-designer-customer-counts';
import { DEMO_LOGIN_HINT } from './demo-login-hint';
import type { DemoLoginAccount } from './demo-login-account-types';
import { formatLiteDesignerStoreLabel } from './demo-login-store-meta';
import { DESIGNER_APP_TAB_LABELS } from './designer-app-tabs';

export const DESIGNER_LOGIN_COUNT = INCLUDED_DEMO_TEST_DESIGNER_COUNT;

function designerSearchHaystack(parts: string[]) {
  return parts.join(' ').toLowerCase();
}

function withDesignerCustomerCount(
  account: Omit<DemoLoginAccount, 'customerCount'>,
): DemoLoginAccount {
  const customerCount = getDemoDesignerCustomerCount(account.id);

  return {
    ...account,
    customerCount,
    searchHaystack: `${account.searchHaystack ?? ''} ${formatDemoDesignerCustomerCount(customerCount)} ${customerCount}`
      .trim()
      .toLowerCase(),
  };
}

function accumulatedDesignerYearLabel(profileKey: string, historyYears?: number) {
  if (profileKey === '1y') {
    return '1년';
  }

  if (profileKey === '3y') {
    return '3년';
  }

  if (profileKey === '5y') {
    return '5년';
  }

  if (profileKey.startsWith('fleet-') && historyYears) {
    return `${historyYears}년차`;
  }

  if (profileKey.startsWith('exp-')) {
    return '증원';
  }

  return '2년';
}

function accumulatedDesignerAccent(profileKey: string) {
  if (profileKey === '1y') {
    return '#00C2A8';
  }

  if (profileKey === '3y') {
    return '#F59E0B';
  }

  if (profileKey === '5y') {
    return '#E85D4C';
  }

  return '#7B5EE6';
}

const DEMO_DESIGNER_ACCOUNT: DemoLoginAccount = withDesignerCustomerCount({
  id: 'demo-designer-local',
  group: '디자이너',
  roleLabel: '데모',
  loginLabel: '데모 디자이너 · 김미용',
  email: DEMO_LOGIN_HINT.designerEmail,
  password: DEMO_LOGIN_HINT.designerPassword,
  meta: `${formatLiteDesignerStoreLabel('demo-designer-local')} · ${DESIGNER_APP_TAB_LABELS}`,
  accent: '#7B5EE6',
  searchHaystack: designerSearchHaystack([
    '데모',
    '디자이너',
    DEMO_LOGIN_HINT.designerEmail,
    '김미용',
    'demo-designer-local',
      formatLiteDesignerStoreLabel('demo-designer-local'),
  ]),
});

const BETA_DESIGNER_ACCOUNTS: DemoLoginAccount[] = filterDemoDesignersWithCustomers(BETA_DESIGNERS).map((designer) =>
  withDesignerCustomerCount({
    id: designer.id,
    group: '디자이너',
    roleLabel: '베타',
    loginLabel: designer.name,
    email: designer.email,
    password: designer.password,
    meta: `${formatLiteDesignerStoreLabel(designer.id)} · 3년 누적`,
    accent: '#9B8AFB',
    searchHaystack: designerSearchHaystack([
      '베타',
      '디자이너',
      designer.name,
      designer.email,
      designer.id,
      formatLiteDesignerStoreLabel(designer.id),
    ]),
  }),
);

function accumulatedDesignerRoleLabel(profileKey: string) {
  return profileKey.startsWith('exp-') || profileKey.startsWith('fleet-') ? '증원' : '누적';
}

function buildAccumulatedDesignerLoginAccounts(): DemoLoginAccount[] {
  const storeLabelByDesignerId = new Map<string, string>();

  return filterDemoDesignersWithCustomers(ACCUMULATED_TEST_DESIGNERS_PUBLIC).map((designer) => {
    const roleLabel = accumulatedDesignerRoleLabel(designer.profileKey);
    const historyYears =
      'historyYears' in designer && typeof designer.historyYears === 'number'
        ? designer.historyYears
        : undefined;
    const yearLabel = accumulatedDesignerYearLabel(designer.profileKey, historyYears);
    let storeLabel = storeLabelByDesignerId.get(designer.id);

    if (!storeLabel) {
      const fleetStoreId = 'storeId' in designer ? designer.storeId : undefined;
      storeLabel = formatLiteDesignerStoreLabel(
        designer.id,
        typeof fleetStoreId === 'string' ? fleetStoreId : undefined,
      );
      storeLabelByDesignerId.set(designer.id, storeLabel);
    }

    const displayName =
      'displayName' in designer && typeof designer.displayName === 'string'
        ? designer.displayName
        : undefined;
    const isFleetDesigner = designer.profileKey.startsWith('fleet-');

    return withDesignerCustomerCount({
      id: designer.id,
      group: '디자이너',
      roleLabel,
      loginLabel: designer.loginLabel,
      displayName,
      email: designer.email,
      password: designer.password,
      meta: isFleetDesigner
        ? `${storeLabel.split(' · ')[0] ?? storeLabel} · ${yearLabel}`
        : `${storeLabel} · ${yearLabel} 누적`,
      accent: accumulatedDesignerAccent(designer.profileKey),
      searchHaystack: designerSearchHaystack([
        roleLabel,
        '누적',
        '증원',
        '디자이너',
        designer.loginLabel,
        displayName ?? '',
        designer.email,
        designer.profileKey,
        designer.id,
        storeLabel,
      ]),
    });
  });
}

let designerLoginAccountsCache: DemoLoginAccount[] | null = null;

/** 디자이너 탭 — 첫 펼침·검색 시에만 생성 */
export function getDesignerLoginAccounts(): DemoLoginAccount[] {
  if (!designerLoginAccountsCache) {
    const accounts = [
      DEMO_DESIGNER_ACCOUNT,
      ...BETA_DESIGNER_ACCOUNTS,
      ...buildAccumulatedDesignerLoginAccounts(),
    ].filter((account) => isDemoDesignerIncludedInTestAccounts(account.id));

    designerLoginAccountsCache = accounts;
  }

  return designerLoginAccountsCache;
}

/** 테스트 로그인 진입 직후 백그라운드 워밍 (idle 대기 없음) */
export function prewarmDesignerLoginAccounts() {
  if (designerLoginAccountsCache) {
    return;
  }

  setTimeout(() => {
    getDesignerLoginAccounts();
  }, 0);
}
