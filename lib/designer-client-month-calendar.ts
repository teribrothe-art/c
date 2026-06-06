import { toLocalDateString } from './designer-revenue-weekly';
import { parseDateKey, toDateKey } from './designer-client-date-filter';

export const CALENDAR_WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type MonthCalendarDayCell = {
  dateKey: string | null;
  day: number;
  inMonth: boolean;
  count: number;
  isToday: boolean;
  isSelected: boolean;
  selectable: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function getMonthKey(year: number, month: number) {
  return `${year}-${pad2(month)}`;
}

export function shiftCalendarMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function canGoToNextCalendarMonth(year: number, month: number) {
  const today = parseDateKey(toLocalDateString());
  const next = shiftCalendarMonth(year, month, 1);

  return getMonthKey(next.year, next.month).localeCompare(getMonthKey(today.year, today.month)) <= 0;
}

export function canGoToPreviousCalendarMonth(
  year: number,
  month: number,
  earliestDateKey: string | null,
  maxYearsBack = 5,
) {
  const today = parseDateKey(toLocalDateString());
  const earliestMonth = earliestDateKey
    ? earliestDateKey.slice(0, 7)
    : getMonthKey(today.year - maxYearsBack, 1);
  const prev = shiftCalendarMonth(year, month, -1);

  return getMonthKey(prev.year, prev.month).localeCompare(earliestMonth) >= 0;
}

export function buildMonthCalendarGrid(
  year: number,
  month: number,
  countByDate: Map<string, number>,
  selectedDate: string | null,
): MonthCalendarDayCell[] {
  const todayKey = toLocalDateString();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: MonthCalendarDayCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      dateKey: null,
      day: 0,
      inMonth: false,
      count: 0,
      isToday: false,
      isSelected: false,
      selectable: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(year, month, day);
    const count = countByDate.get(dateKey) ?? 0;

    cells.push({
      dateKey,
      day,
      inMonth: true,
      count,
      isToday: dateKey === todayKey,
      isSelected: selectedDate === dateKey,
      selectable: count > 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      dateKey: null,
      day: 0,
      inMonth: false,
      count: 0,
      isToday: false,
      isSelected: false,
      selectable: false,
    });
  }

  return cells;
}

export function countTreatmentsInMonth(countByDate: Map<string, number>, year: number, month: number) {
  const prefix = getMonthKey(year, month);
  let total = 0;

  for (const [dateKey, count] of countByDate.entries()) {
    if (dateKey.startsWith(prefix)) {
      total += count;
    }
  }

  return total;
}
