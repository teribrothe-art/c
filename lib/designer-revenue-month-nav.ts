import { toLocalDateString } from './designer-revenue-weekly';

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

export function getCurrentMonthKey() {
  return toLocalDateString().slice(0, 7);
}

export function isValidMonthKey(monthKey: string | undefined): monthKey is string {
  return Boolean(monthKey && MONTH_KEY_PATTERN.test(monthKey));
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function canGoToNextMonth(monthKey: string) {
  return monthKey.localeCompare(getCurrentMonthKey()) < 0;
}

/** 데이터가 없는 달도 탐색 가능 — 최대 36개월 이전까지 */
export function canGoToPreviousMonth(monthKey: string, maxMonthsBack = 36) {
  const earliest = shiftMonthKey(getCurrentMonthKey(), -maxMonthsBack);

  return monthKey.localeCompare(earliest) > 0;
}
