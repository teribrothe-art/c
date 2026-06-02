import type { DemoLoginAccount } from './demo-login-accounts';

const MAX_RESULTS = 60;

export function filterDemoLoginCustomerAccounts(
  accounts: DemoLoginAccount[],
  query: string,
): { accounts: DemoLoginAccount[]; totalMatches: number; truncated: boolean } {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return { accounts: [], totalMatches: accounts.length, truncated: false };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const matches = accounts.filter((account) => {
    const haystack =
      account.searchHaystack ??
      [account.loginLabel, account.email, account.meta ?? '', account.id].join(' ').toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });

  return {
    accounts: matches.slice(0, MAX_RESULTS),
    totalMatches: matches.length,
    truncated: matches.length > MAX_RESULTS,
  };
}
