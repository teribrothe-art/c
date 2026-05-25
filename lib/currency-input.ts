/** 금액 입력 — 숫자만 저장, 화면에는 천 단위 구분 */

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
