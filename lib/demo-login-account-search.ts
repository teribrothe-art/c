import type { DemoLoginAccount } from './demo-login-accounts';
import {
  getCustomerNameConsonant,
  type CustomerConsonantTab,
} from './korean-consonant';

const MAX_RESULTS = 60;

function matchesQuery(account: DemoLoginAccount, normalized: string) {
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const haystack =
    account.searchHaystack ??
    [account.loginLabel, account.email, account.meta ?? '', account.id, account.roleLabel]
      .join(' ')
      .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

export function filterDemoLoginAccounts(
  accounts: DemoLoginAccount[],
  query: string,
  consonant?: CustomerConsonantTab | null,
): { accounts: DemoLoginAccount[]; totalMatches: number; truncated: boolean } {
  const normalized = query.trim().toLowerCase();

  let scoped = accounts;

  if (consonant) {
    scoped = scoped.filter(
      (account) => getCustomerNameConsonant(account.loginLabel) === consonant,
    );
  }

  if (!normalized) {
    return {
      accounts: consonant ? scoped.slice(0, MAX_RESULTS) : [],
      totalMatches: scoped.length,
      truncated: consonant ? scoped.length > MAX_RESULTS : false,
    };
  }

  const matches = scoped.filter((account) => matchesQuery(account, normalized));

  return {
    accounts: matches.slice(0, MAX_RESULTS),
    totalMatches: matches.length,
    truncated: matches.length > MAX_RESULTS,
  };
}

/** @deprecated filterDemoLoginAccounts 사용 */
export const filterDemoLoginCustomerAccounts = filterDemoLoginAccounts;
