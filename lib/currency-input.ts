/** 금액 입력 — 숫자만 저장, 화면에는 천 단위 구분 */

/** 매출(총 매출) 전용 — 천 단위 구분 */
export function formatSalesAmount(amount: number) {
  return amount.toLocaleString('ko-KR');
}

/** 매출 외 금액 — 구분 없이 표시 */
export function formatPlainAmount(amount: number) {
  return String(Math.round(amount));
}

export function formatAmount(amount: number) {
  return amount.toLocaleString('ko-KR');
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
