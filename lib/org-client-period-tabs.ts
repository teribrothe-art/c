import { formatMonthKeyLabel } from './designer-revenue-analytics';
import { formatTreatmentDateSectionLabel } from './designer-customer-grid';
import { formatDateWithWeekday, getWeekStartMonday } from './designer-revenue-weekly';
import type { OrgClientListItem } from './org-client-list';

export type ClientPeriodSelection = {
  monthKey: string | null;
  weekKey: string | null;
  date: string | null;
};

export type ClientPeriodTab = {
  key: string;
  label: string;
  count: number;
};

function addDaysIso(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function monthKeyOf(date: string) {
  return date.slice(0, 7);
}

function formatWeekRangeLabel(weekStart: string) {
  const weekEnd = addDaysIso(weekStart, 6);
  const [, startMonth, startDay] = weekStart.split('-');
  const [, endMonth, endDay] = weekEnd.split('-');

  return `${Number(startMonth)}.${Number(startDay)} ~ ${Number(endMonth)}.${Number(endDay)}`;
}

function isDateInWeek(date: string, weekKey: string) {
  const weekEnd = addDaysIso(weekKey, 6);

  return date >= weekKey && date <= weekEnd;
}

export function buildClientMonthTabs(items: OrgClientListItem[]): ClientPeriodTab[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const monthKey = monthKeyOf(item.treatmentDate);
    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([monthKey, count]) => ({
      key: monthKey,
      label: formatMonthKeyLabel(monthKey),
      count,
    }));
}

export function buildClientWeekTabs(items: OrgClientListItem[], monthKey: string): ClientPeriodTab[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (monthKeyOf(item.treatmentDate) !== monthKey) {
      continue;
    }

    const weekKey = getWeekStartMonday(item.treatmentDate);
    counts.set(weekKey, (counts.get(weekKey) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([weekKey, count]) => ({
      key: weekKey,
      label: formatWeekRangeLabel(weekKey),
      count,
    }));
}

export function buildClientDayTabs(items: OrgClientListItem[], weekKey: string): ClientPeriodTab[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!isDateInWeek(item.treatmentDate, weekKey)) {
      continue;
    }

    counts.set(item.treatmentDate, (counts.get(item.treatmentDate) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, count]) => ({
      key: date,
      label: formatDateWithWeekday(date),
      count,
    }));
}

export function filterClientsByPeriod(
  items: OrgClientListItem[],
  selection: ClientPeriodSelection,
): OrgClientListItem[] {
  return items.filter((item) => {
    if (selection.date) {
      return item.treatmentDate === selection.date;
    }

    if (selection.weekKey) {
      return isDateInWeek(item.treatmentDate, selection.weekKey);
    }

    if (selection.monthKey) {
      return monthKeyOf(item.treatmentDate) === selection.monthKey;
    }

    return true;
  });
}

export function defaultClientPeriodSelection(items: OrgClientListItem[]): ClientPeriodSelection {
  const months = buildClientMonthTabs(items);

  if (months.length === 0) {
    return { monthKey: null, weekKey: null, date: null };
  }

  return { monthKey: months[0].key, weekKey: null, date: null };
}

export function formatClientPeriodScopeLabel(selection: ClientPeriodSelection, items: OrgClientListItem[]) {
  if (selection.date) {
    const count = items.filter((item) => item.treatmentDate === selection.date).length;

    return formatTreatmentDateSectionLabel(selection.date, count);
  }

  if (selection.weekKey) {
    const weekTabs = buildClientWeekTabs(items, selection.monthKey ?? '');
    const week = weekTabs.find((tab) => tab.key === selection.weekKey);

    return week ? `${week.label} · ${week.count}건` : '주별';
  }

  if (selection.monthKey) {
    return formatMonthKeyLabel(selection.monthKey);
  }

  return '전체';
}
