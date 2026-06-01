import type { DemoLoginAccount } from './demo-login-accounts';
import {
  getCustomerNameConsonant,
  type CustomerConsonantTab,
} from './korean-consonant';

const MAX_RESULTS = 60;

export type DemoLoginAccountFilterOptions = {
  offset?: number;
  limit?: number;
};

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
  options?: DemoLoginAccountFilterOptions,
): { accounts: DemoLoginAccount[]; totalMatches: number; truncated: boolean; hasMore: boolean } {
  const normalized = query.trim().toLowerCase();
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.max(1, options?.limit ?? MAX_RESULTS);

  let scoped = accounts;

  if (consonant) {
    scoped = scoped.filter(
      (account) => getCustomerNameConsonant(account.loginLabel) === consonant,
    );
  }

  if (!normalized) {
    const totalMatches = scoped.length;
    const slice = scoped.slice(offset, offset + limit);
    const hasPaging = consonant != null || options != null;

    return {
      accounts: hasPaging ? slice : [],
      totalMatches,
      truncated: offset + slice.length < totalMatches,
      hasMore: offset + slice.length < totalMatches,
    };
  }

  const matches = scoped.filter((account) => matchesQuery(account, normalized));
  const slice = matches.slice(offset, offset + limit);

  return {
    accounts: slice,
    totalMatches: matches.length,
    truncated: offset + slice.length < matches.length,
    hasMore: offset + slice.length < matches.length,
  };
}

/** @deprecated filterDemoLoginAccounts 사용 */
export const filterDemoLoginCustomerAccounts = filterDemoLoginAccounts;
