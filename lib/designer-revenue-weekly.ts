import type { PaymentRecord } from './payment-record';
import { customerPaymentAmountOf } from './payment-record';

/** 달력 헤더와 동일 — 일요일 시작 */
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type WeekdayRevenueCell = {
  date: string;
  weekdayLabel: (typeof WEEKDAY_LABELS)[number];
  dateWithWeekdayLabel: string;
  displayDate: string;
  totalAmount: number;
  settlementCount: number;
  inSelectedMonth: boolean;
  isToday: boolean;
};

export type WeeklyRevenueWeek = {
  weekKey: string;
  label: string;
  days: WeekdayRevenueCell[];
  weekTotal: number;
  settlementCount: number;
};

export type MonthWeekdayTotal = {
  weekdayLabel: (typeof WEEKDAY_LABELS)[number];
  totalAmount: number;
  settlementCount: number;
};

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateWithWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const [, month, day] = date.split('-');
  const weekday = WEEKDAY_LABELS[parsed.getDay()];

  return `${Number(month)}.${Number(day)} (${weekday})`;
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);

  return toLocalDateString(parsed);
}

export function getWeekdayLabelForDate(date: string): (typeof WEEKDAY_LABELS)[number] {
  const parsed = new Date(`${date}T12:00:00`);

  return WEEKDAY_LABELS[parsed.getDay()];
}

/** 선택한 달의 요일(일~토)별 정산 합계 */
export function buildMonthWeekdayTotals(
  completed: PaymentRecord[],
  monthKey: string,
): MonthWeekdayTotal[] {
  const totals = new Map<(typeof WEEKDAY_LABELS)[number], { totalAmount: number; settlementCount: number }>();

  for (const label of WEEKDAY_LABELS) {
    totals.set(label, { totalAmount: 0, settlementCount: 0 });
  }

  for (const payment of completed) {
    const date = settlementDateOf(payment);

    if (date.slice(0, 7) !== monthKey) {
      continue;
    }

    const weekdayLabel = getWeekdayLabelForDate(date);
    const current = totals.get(weekdayLabel) ?? { totalAmount: 0, settlementCount: 0 };
    current.totalAmount += customerPaymentAmountOf(payment);
    current.settlementCount += 1;
    totals.set(weekdayLabel, current);
  }

  return WEEKDAY_LABELS.map((weekdayLabel) => {
    const stats = totals.get(weekdayLabel) ?? { totalAmount: 0, settlementCount: 0 };

    return {
      weekdayLabel,
      totalAmount: stats.totalAmount,
      settlementCount: stats.settlementCount,
    };
  });
}

/** 달력 주(일~토)의 일요일 */
export function getWeekStartSunday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() - parsed.getDay());

  return toLocalDateString(parsed);
}

/** @deprecated getWeekStartSunday 사용 */
export function getWeekStartMonday(date: string) {
  return getWeekStartSunday(date);
}

function formatWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  const startLabel = formatDateWithWeekday(weekStart).split(' ')[0];
  const endLabel = formatDateWithWeekday(end).split(' ')[0];

  return `${startLabel} ~ ${endLabel}`;
}

function settlementDateOf(payment: PaymentRecord) {
  return (payment.settled_at ?? payment.paid_at ?? payment.created_at).slice(0, 10);
}

function buildDayTotals(
  completed: PaymentRecord[],
  amountOf: (payment: PaymentRecord) => number = customerPaymentAmountOf,
) {
  const map = new Map<string, { totalAmount: number; settlementCount: number }>();

  for (const payment of completed) {
    const date = settlementDateOf(payment);
    const current = map.get(date) ?? { totalAmount: 0, settlementCount: 0 };
    current.totalAmount += amountOf(payment);
    current.settlementCount += 1;
    map.set(date, current);
  }

  return map;
}

function sumDaysInSelectedMonth(
  days: WeekdayRevenueCell[],
  pick: (day: WeekdayRevenueCell) => number,
) {
  return days.reduce((sum, day) => sum + (day.inSelectedMonth ? pick(day) : 0), 0);
}

/** 주간 셀 중 선택 월에 속하는 날짜 매출 합계 */
export function sumWeekdayRevenueInMonth(days: WeekdayRevenueCell[]) {
  return sumDaysInSelectedMonth(days, (day) => day.totalAmount);
}

/** 주간 셀 중 선택 월에 속하는 날짜 정산 건수 합계 */
export function sumWeekdaySettlementCountInMonth(days: WeekdayRevenueCell[]) {
  return sumDaysInSelectedMonth(days, (day) => day.settlementCount);
}

function buildWeeklyAmountWeeks(
  completed: PaymentRecord[],
  monthKey: string,
  amountOf: (payment: PaymentRecord) => number,
): WeeklyRevenueWeek[] {
  const dayTotals = buildDayTotals(completed, amountOf);
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDateOfMonth(monthKey);
  let cursor = getWeekStartSunday(monthStart);
  const weeks: WeeklyRevenueWeek[] = [];
  const guard = new Set<string>();

  while (cursor <= addDays(monthEnd, 6)) {
    if (guard.has(cursor)) {
      break;
    }

    guard.add(cursor);

    const days = buildWeekCells(cursor, dayTotals, monthKey);
    const overlapsMonth = days.some((day) => day.inSelectedMonth);

    if (overlapsMonth) {
      weeks.push({
        weekKey: cursor,
        label: formatWeekRange(cursor),
        days,
        weekTotal: sumWeekdayRevenueInMonth(days),
        settlementCount: sumWeekdaySettlementCountInMonth(days),
      });
    }

    cursor = addDays(cursor, 7);
  }

  if (weeks.length === 0) {
    const weekStart = getWeekStartSunday(monthStart);
    const days = buildWeekCells(weekStart, dayTotals, monthKey);

    weeks.push({
      weekKey: weekStart,
      label: formatWeekRange(weekStart),
      days,
      weekTotal: 0,
      settlementCount: 0,
    });
  }

  return weeks;
}

function buildWeekCells(
  weekStartSunday: string,
  dayTotals: Map<string, { totalAmount: number; settlementCount: number }>,
  monthKey: string,
): WeekdayRevenueCell[] {
  const today = toLocalDateString();

  return WEEKDAY_LABELS.map((weekdayLabel, index) => {
    const date = addDays(weekStartSunday, index);
    const stats = dayTotals.get(date) ?? { totalAmount: 0, settlementCount: 0 };

    return {
      date,
      weekdayLabel,
      dateWithWeekdayLabel: formatDateWithWeekday(date),
      displayDate: date.replaceAll('-', '.'),
      totalAmount: stats.totalAmount,
      settlementCount: stats.settlementCount,
      inSelectedMonth: date.slice(0, 7) === monthKey,
      isToday: date === today,
    };
  });
}

function lastDateOfMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0);

  return toLocalDateString(lastDay);
}

/** 선택한 달의 주간(일~토 7일) 매출 묶음 — 달력 행과 동일 */
export function buildWeeklyRevenueWeeks(
  completed: PaymentRecord[],
  monthKey: string,
): WeeklyRevenueWeek[] {
  return buildWeeklyAmountWeeks(completed, monthKey, customerPaymentAmountOf);
}

/** @deprecated buildWeeklyRevenueWeeks와 동일 (고객 실결제 금액 기준) */
export function buildWeeklyGrossSalesWeeks(
  completed: PaymentRecord[],
  monthKey: string,
): WeeklyRevenueWeek[] {
  return buildWeeklyRevenueWeeks(completed, monthKey);
}

export function resolveDefaultWeekKey(weeks: WeeklyRevenueWeek[], monthKey: string) {
  const today = toLocalDateString();
  const todayWeek = getWeekStartSunday(today);

  if (today.slice(0, 7) === monthKey && weeks.some((week) => week.weekKey === todayWeek)) {
    return todayWeek;
  }

  const withRevenue = weeks.find((week) => week.weekTotal > 0);

  return withRevenue?.weekKey ?? weeks[0]?.weekKey ?? getWeekStartSunday(`${monthKey}-01`);
}
