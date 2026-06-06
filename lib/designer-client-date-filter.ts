import type { DesignerClientListItem } from './customer-invitations';
import { toLocalDateString } from './designer-revenue-weekly';

export type DesignerClientDateFilterMode = 'all' | 'year' | 'month' | 'day';

export type DesignerClientDateFilter = {
  mode: DesignerClientDateFilterMode;
  year: number;
  month: number;
  day: number;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return { year, month, day };
}

export function getDefaultDesignerClientDateFilter(): DesignerClientDateFilter {
  const today = parseDateKey(toLocalDateString());

  return {
    mode: 'all',
    year: today.year,
    month: today.month,
    day: today.day,
  };
}

export function getTreatmentDateBounds(items: DesignerClientListItem[]) {
  let min: string | null = null;
  let max: string | null = null;

  for (const item of items) {
    if (!min || item.treatmentDate < min) {
      min = item.treatmentDate;
    }

    if (!max || item.treatmentDate > max) {
      max = item.treatmentDate;
    }
  }

  return { min, max };
}

export function filterDesignerClientsByDateFilter(
  items: DesignerClientListItem[],
  filter: DesignerClientDateFilter,
) {
  if (filter.mode === 'all') {
    return items;
  }

  return items.filter((item) => {
    const { year, month, day } = parseDateKey(item.treatmentDate);

    if (filter.mode === 'year') {
      return year === filter.year;
    }

    if (filter.mode === 'month') {
      return year === filter.year && month === filter.month;
    }

    return item.treatmentDate === toDateKey(filter.year, filter.month, filter.day);
  });
}

export function formatDesignerClientDateFilterLabel(filter: DesignerClientDateFilter) {
  if (filter.mode === 'all') {
    return '전체 기간';
  }

  if (filter.mode === 'year') {
    return `${filter.year}년`;
  }

  if (filter.mode === 'month') {
    return `${filter.year}년 ${filter.month}월`;
  }

  return `${filter.year}년 ${filter.month}월 ${filter.day}일`;
}

export function countDesignerClientsForDateFilter(
  items: DesignerClientListItem[],
  filter: DesignerClientDateFilter,
) {
  return filterDesignerClientsByDateFilter(items, filter).length;
}

function shiftDateParts(filter: DesignerClientDateFilter, delta: number): DesignerClientDateFilter {
  if (filter.mode === 'year') {
    return { ...filter, year: filter.year + delta };
  }

  if (filter.mode === 'month') {
    const date = new Date(filter.year, filter.month - 1 + delta, 1);

    return {
      ...filter,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  }

  const date = new Date(filter.year, filter.month - 1, filter.day + delta);

  return {
    ...filter,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function shiftDesignerClientDateFilter(
  filter: DesignerClientDateFilter,
  delta: number,
): DesignerClientDateFilter {
  if (filter.mode === 'all') {
    return filter;
  }

  return shiftDateParts(filter, delta);
}

export function canShiftDesignerClientDateFilterForward(filter: DesignerClientDateFilter) {
  if (filter.mode === 'all') {
    return false;
  }

  const today = parseDateKey(toLocalDateString());
  const next = shiftDesignerClientDateFilter(filter, 1);

  if (filter.mode === 'year') {
    return next.year <= today.year;
  }

  if (filter.mode === 'month') {
    const nextKey = `${next.year}-${pad2(next.month)}`;
    const todayKey = `${today.year}-${pad2(today.month)}`;

    return nextKey.localeCompare(todayKey) <= 0;
  }

  return toDateKey(next.year, next.month, next.day).localeCompare(toLocalDateString()) <= 0;
}

export function canShiftDesignerClientDateFilterBackward(
  filter: DesignerClientDateFilter,
  items: DesignerClientListItem[],
  maxYearsBack = 5,
) {
  if (filter.mode === 'all') {
    return false;
  }

  const bounds = getTreatmentDateBounds(items);
  const today = parseDateKey(toLocalDateString());
  const earliestYear = Math.min(
    bounds.min ? parseDateKey(bounds.min).year : today.year - maxYearsBack,
    today.year - maxYearsBack,
  );
  const prev = shiftDesignerClientDateFilter(filter, -1);

  if (filter.mode === 'year') {
    return prev.year >= earliestYear;
  }

  if (filter.mode === 'month') {
    const prevKey = `${prev.year}-${pad2(prev.month)}`;
    const earliestKey = bounds.min
      ? bounds.min.slice(0, 7)
      : `${earliestYear}-01`;

    return prevKey.localeCompare(earliestKey) >= 0;
  }

  const earliestDay = bounds.min ?? toDateKey(earliestYear, 1, 1);

  return toDateKey(prev.year, prev.month, prev.day).localeCompare(earliestDay) >= 0;
}

export function dateFilterToSelectedDate(filter: DesignerClientDateFilter): string | null {
  if (filter.mode === 'day') {
    return toDateKey(filter.year, filter.month, filter.day);
  }

  return null;
}
