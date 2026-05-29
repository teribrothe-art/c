const CHO = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

/** 가입고객 탭용 초성 (쌍자음은 기본 자음으로 묶음) */
export const CUSTOMER_CONSONANT_TABS = [
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

export type CustomerConsonantTab = (typeof CUSTOMER_CONSONANT_TABS)[number];

const DOUBLE_TO_SINGLE: Record<string, CustomerConsonantTab> = {
  'ㄲ': 'ㄱ',
  'ㄸ': 'ㄷ',
  'ㅃ': 'ㅂ',
  'ㅆ': 'ㅅ',
  'ㅉ': 'ㅈ',
};

export function normalizeCustomerConsonant(value: string): CustomerConsonantTab | null {
  const mapped = DOUBLE_TO_SINGLE[value] ?? value;

  if ((CUSTOMER_CONSONANT_TABS as readonly string[]).includes(mapped)) {
    return mapped as CustomerConsonantTab;
  }

  return null;
}

export function getKoreanInitialConsonant(char: string): string | null {
  const code = char.charCodeAt(0);

  if (code >= 0xac00 && code <= 0xd7a3) {
    const index = Math.floor((code - 0xac00) / 588);
    return CHO[index] ?? null;
  }

  return null;
}

/** 이름·라벨의 첫 한글 초성 (없으면 ㅇ) */
export function getCustomerNameConsonant(label: string): CustomerConsonantTab {
  const trimmed = label.trim();

  for (const char of trimmed) {
    const initial = getKoreanInitialConsonant(char);

    if (initial) {
      return normalizeCustomerConsonant(initial) ?? 'ㅇ';
    }
  }

  return 'ㅇ';
}

export function countAccountsByCustomerConsonant<T extends { loginLabel: string }>(
  accounts: T[],
): Record<CustomerConsonantTab, number> {
  const counts = Object.fromEntries(
    CUSTOMER_CONSONANT_TABS.map((tab) => [tab, 0]),
  ) as Record<CustomerConsonantTab, number>;

  for (const account of accounts) {
    const tab = getCustomerNameConsonant(account.loginLabel);
    counts[tab] += 1;
  }

  return counts;
}
