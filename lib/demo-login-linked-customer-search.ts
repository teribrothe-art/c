import { BETA_CUSTOMERS, BETA_DESIGNERS, BETA_TEST_PASSWORD } from './beta-test-accounts';
import {
  ACCUMULATED_TEST_PROFILE_CONFIGS,
} from './demo-accumulated-test-accounts';
import { resolveAccumulatedProfileCustomers } from './demo-accumulated-profile-customers';
import {
  DESIGNER_LINKED_CUSTOMER_COUNT,
  DEMO_DESIGNER_LINKED_CUSTOMERS,
} from './demo-designer-linked-customers';
import {
  getGeneralSignupCustomersSnapshot,
  prefetchGeneralSignupCustomers,
} from './demo-general-signup-customers';
import { isFleetProfileKey } from './demo-fleet-100-designers';
import { DEMO_LOGIN_HINT } from './demo-login-hint';
import { isDemoDesignerIncludedInTestAccounts } from './demo-designer-customer-counts';
import type { DemoLoginAccount } from './demo-login-account-types';
import {
  getCustomerNameConsonant,
  type CustomerConsonantTab,
} from './korean-consonant';
import { colors } from './theme';
import type { BetaTestAccount } from './beta-test-accounts';

const LINKED_CUSTOMER_SEARCH_LIMIT = 60;

function toLinkedCustomerLoginAccount(
  customer: BetaTestAccount,
  options: {
    profileLabel: string;
    designerName: string;
    designerId: string;
    password: string;
    index: number;
    total: number;
  },
): DemoLoginAccount {
  const { profileLabel, designerName, designerId, password, index, total } = options;
  const haystack = [
    customer.name,
    customer.email,
    customer.id,
    profileLabel,
    designerName,
    designerId,
    '가입고객',
    '데모',
    '베타',
    '누적',
    '증원',
    '일반',
    '일반가입',
  ]
    .join(' ')
    .toLowerCase();

  return {
    id: customer.id,
    group: '가입고객',
    roleLabel: '고객',
    loginLabel: customer.name ?? customer.email,
    email: customer.email,
    password,
    meta: `${designerName} · ${profileLabel} · ${index + 1}/${total}`,
    accent: colors.coral,
    searchHaystack: haystack,
  };
}

function matchesLinkedCustomerQuery(haystack: string, normalized: string) {
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return tokens.every((token) => haystack.includes(token));
}

function profileDesignerHaystack(config: (typeof ACCUMULATED_TEST_PROFILE_CONFIGS)[number]) {
  return [config.designer.email, config.designer.name ?? '', config.key]
    .join(' ')
    .toLowerCase();
}

function profileMatchesSearchTokens(
  config: (typeof ACCUMULATED_TEST_PROFILE_CONFIGS)[number],
  normalized: string,
) {
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  const haystack = profileDesignerHaystack(config);

  return tokens.every((token) => haystack.includes(token));
}

function fleetConfigsForLinkedSearch(normalized: string) {
  const matched = ACCUMULATED_TEST_PROFILE_CONFIGS.filter(
    (config) =>
      isFleetProfileKey(config.key) &&
      isDemoDesignerIncludedInTestAccounts(config.designer.id) &&
      profileMatchesSearchTokens(config, normalized),
  );

  return matched.slice(0, 8);
}

function nonFleetConfigsForLinkedSearch() {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.filter(
    (config) => !isFleetProfileKey(config.key) && isDemoDesignerIncludedInTestAccounts(config.designer.id),
  );
}

export { prefetchGeneralSignupCustomers } from './demo-general-signup-customers';

/** 가입고객 탭 — 검색 1자+(일반가입) · 2자+(누적) · 초성(데모·베타·일반) */
export function searchLinkedCustomerLoginAccounts(
  query: string,
  consonant?: CustomerConsonantTab | null,
) {
  const normalized = query.trim().toLowerCase();
  const matches: DemoLoginAccount[] = [];
  let totalMatches = 0;

  const consider = (
    customer: BetaTestAccount,
    source: {
      profileLabel: string;
      designerName: string;
      designerId: string;
      password: string;
      total: number;
      index: number;
    },
  ) => {
    const label = customer.name ?? customer.email;

    if (consonant && getCustomerNameConsonant(label) !== consonant) {
      return;
    }

    const account = toLinkedCustomerLoginAccount(customer, source);

    if (normalized && !matchesLinkedCustomerQuery(account.searchHaystack ?? '', normalized)) {
      return;
    }

    totalMatches += 1;

    if (matches.length < LINKED_CUSTOMER_SEARCH_LIMIT) {
      matches.push(account);
    }
  };

  for (const [index, customer] of DEMO_DESIGNER_LINKED_CUSTOMERS.entries()) {
    consider(customer, {
      profileLabel: '데모',
      designerName: '김미용 디자이너',
      designerId: 'demo-designer-local',
      password: DEMO_LOGIN_HINT.customerPassword,
      total: DEMO_DESIGNER_LINKED_CUSTOMERS.length,
      index,
    });
  }

  for (const [index, customer] of BETA_CUSTOMERS.entries()) {
    const designer = BETA_DESIGNERS[index];

    if (!designer || !isDemoDesignerIncludedInTestAccounts(designer.id)) {
      continue;
    }

    consider(customer, {
      profileLabel: '베타',
      designerName: designer?.name ?? '베타 디자이너',
      designerId: designer?.id ?? '',
      password: BETA_TEST_PASSWORD,
      total: 1,
      index: 0,
    });
  }

  const generalSignupCustomers = getGeneralSignupCustomersSnapshot();

  if (normalized.length >= 1 || consonant) {
    for (const [index, customer] of generalSignupCustomers.entries()) {
      consider(customer, {
        profileLabel: '일반가입',
        designerName: '디자이너 연동 전',
        designerId: '',
        password: customer.password,
        total: generalSignupCustomers.length,
        index,
      });

      if (
        matches.length >= LINKED_CUSTOMER_SEARCH_LIMIT &&
        totalMatches > LINKED_CUSTOMER_SEARCH_LIMIT
      ) {
        break;
      }
    }
  }

  if (normalized.length >= 2) {
    const scanConfigs = [
      ...nonFleetConfigsForLinkedSearch(),
      ...fleetConfigsForLinkedSearch(normalized),
    ];

    for (const config of scanConfigs) {
      const customers = resolveAccumulatedProfileCustomers(config);
      const profileLabel = `${config.historyYears}년차 · 주 1명 신규`;
      const designerName = config.designer.name ?? config.designer.email;

      for (const [index, customer] of customers.entries()) {
        consider(customer, {
          profileLabel,
          designerName,
          designerId: config.designer.id,
          password: 'test1234',
          total: customers.length,
          index,
        });

        if (
          matches.length >= LINKED_CUSTOMER_SEARCH_LIMIT &&
          totalMatches > LINKED_CUSTOMER_SEARCH_LIMIT
        ) {
          break;
        }
      }

      if (
        matches.length >= LINKED_CUSTOMER_SEARCH_LIMIT &&
        totalMatches > LINKED_CUSTOMER_SEARCH_LIMIT
      ) {
        break;
      }
    }
  }

  if (!normalized && !consonant) {
    const generalCount = getGeneralSignupCustomersSnapshot().length;

    return {
      accounts: [],
      totalMatches: DESIGNER_LINKED_CUSTOMER_COUNT + generalCount,
      truncated: false,
    };
  }

  if (consonant && !normalized) {
    return {
      accounts: matches,
      totalMatches,
      truncated: totalMatches > matches.length,
    };
  }

  return {
    accounts: matches,
    totalMatches,
    truncated: totalMatches > LINKED_CUSTOMER_SEARCH_LIMIT,
  };
}
