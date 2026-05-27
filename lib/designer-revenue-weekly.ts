import type { PaymentRecord } from './payment-record';
import { calculatePaymentFees } from './payment-record';

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const CALENDAR_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

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

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateWithWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const [, month, day] = date.split('-');
  const weekday = CALENDAR_WEEKDAY_LABELS[parsed.getDay()];

  return `${Number(month)}.${Number(day)} (${weekday})`;
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);

  return toLocalDateString(parsed);
}

export function getWeekStartMonday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const day = parsed.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  parsed.setDate(parsed.getDate() + diff);

  return toLocalDateString(parsed);
}

function formatWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  const startLabel = formatDateWithWeekday(weekStart).split(' ')[0];
  const endLabel = formatDateWithWeekday(end).split(' ')[0];

  return `${startLabel} ~ ${endLabel}`;
}

function payoutOf(payment: PaymentRecord) {
  return payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
}

/** 정산·매출 집계 기준일 (로컬 타임존) */
export function settlementDateOfPayment(payment: PaymentRecord): string {
  const raw = payment.settled_at ?? payment.paid_at ?? payment.created_at;

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw.slice(0, 10);
  }

  return toLocalDateString(parsed);
}

function settlementDateOf(payment: PaymentRecord) {
  return settlementDateOfPayment(payment);
}

function buildDayTotals(completed: PaymentRecord[]) {
  const map = new Map<string, { totalAmount: number; settlementCount: number }>();

  for (const payment of completed) {
    const date = settlementDateOf(payment);
    const current = map.get(date) ?? { totalAmount: 0, settlementCount: 0 };
    current.totalAmount += payoutOf(payment);
    current.settlementCount += 1;
    map.set(date, current);
  }

  return map;
}

function buildWeekCells(
  weekStartMonday: string,
  dayTotals: Map<string, { totalAmount: number; settlementCount: number }>,
  monthKey: string,
): WeekdayRevenueCell[] {
  const today = toLocalDateString();

  return WEEKDAY_LABELS.map((weekdayLabel, index) => {
    const date = addDays(weekStartMonday, index);
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

/** 선택한 달의 주간(월~일 7일) 매출 묶음 */
export function buildWeeklyRevenueWeeks(
  completed: PaymentRecord[],
  monthKey: string,
): WeeklyRevenueWeek[] {
  const dayTotals = buildDayTotals(completed);
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDateOfMonth(monthKey);
  let cursor = getWeekStartMonday(monthStart);
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
        weekTotal: days.reduce((sum, day) => sum + day.totalAmount, 0),
        settlementCount: days.reduce((sum, day) => sum + day.settlementCount, 0),
      });
    }

    cursor = addDays(cursor, 7);
  }

  if (weeks.length === 0) {
    const days = buildWeekCells(getWeekStartMonday(monthStart), dayTotals, monthKey);

    weeks.push({
      weekKey: getWeekStartMonday(monthStart),
      label: formatWeekRange(getWeekStartMonday(monthStart)),
      days,
      weekTotal: 0,
      settlementCount: 0,
    });
  }

  return weeks;
}

export function resolveDefaultWeekKey(weeks: WeeklyRevenueWeek[], monthKey: string) {
  const today = toLocalDateString();
  const todayWeek = getWeekStartMonday(today);

  if (today.slice(0, 7) === monthKey && weeks.some((week) => week.weekKey === todayWeek)) {
    return todayWeek;
  }

  const withRevenue = weeks.find((week) => week.weekTotal > 0);

  return withRevenue?.weekKey ?? weeks[0]?.weekKey ?? getWeekStartMonday(`${monthKey}-01`);
}
