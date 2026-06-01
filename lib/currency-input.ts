/** 금액 입력 — 숫자만 저장, 화면 표시용 포맷 */

/** 원(₩) 단위 — 천단위 콤마 + 원 */
export function formatWonAmount(amount: number) {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/** 매출·정산 등 화면 표시 금액 */
export function formatSalesAmount(amount: number) {
  return formatWonAmount(amount);
}

/** formatSalesAmount 와 동일 — 원 단위 */
export function formatPlainAmount(amount: number) {
  return formatWonAmount(amount);
}

export function formatAmount(amount: number) {
  return formatWonAmount(amount);
}

export function sanitizeWonDigits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

/** 입력 필드용 — 숫자만 콤마 (원 접미사 없음) */
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
