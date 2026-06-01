/** 금액 입력 — 숫자만 저장, 화면 표시용 포맷 */

/** 원(₩) 단위 — 숫자 + 천단위 콤마 */
export function formatWonAmount(amount: number) {
  return Math.round(amount).toLocaleString('ko-KR');
}

/** 매출 전용 — 천원 단위 (예: 1,234,123천) */
export function formatSalesAmount(amount: number) {
  const thousands = Math.round(amount / 1000);

  return `${thousands.toLocaleString('ko-KR')}천`;
}

/** 매출 외 금액 — 원 단위 + 콤마 */
export function formatPlainAmount(amount: number) {
  return formatWonAmount(amount);
}

export function formatAmount(amount: number) {
  return formatWonAmount(amount);
}

export function sanitizeWonDigits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export function formatWonDisplay(digits: string) {
  const sanitized = sanitizeWonDigits(digits);

  if (!sanitized) {
    return '';
  }

  return Number(sanitized).toLocaleString('ko-KR');
}

export function parseWonAmount(digits: string) {
  const value = Number(sanitizeWonDigits(digits));

  return Number.isFinite(value) ? value : 0;
}
