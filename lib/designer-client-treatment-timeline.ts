import type { DesignerClientListItem } from './customer-invitations';
import { TREATMENT_TYPE_OPTIONS } from './treatment-options';

export type DesignerClientCategorySection = {
  categoryKey: string;
  categoryLabel: string;
  icon: string;
  items: DesignerClientListItem[];
};

export type DesignerClientDaySection = {
  dayKey: string;
  dayLabel: string;
  totalCount: number;
  categories: DesignerClientCategorySection[];
};

export type DesignerClientMonthSection = {
  monthKey: string;
  monthLabel: string;
  totalCount: number;
  days: DesignerClientDaySection[];
};

const CATEGORY_ORDER = [
  ...TREATMENT_TYPE_OPTIONS.map((option) => option.label),
  '기타',
  '__invite__',
] as const;

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  __invite__: { label: '초대·연결', icon: '✉️' },
  기타: { label: '기타', icon: '📋' },
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

for (const option of TREATMENT_TYPE_OPTIONS) {
  CATEGORY_META[option.label] = { label: option.label, icon: option.icon };
}

function monthKeyFromDate(treatmentDate: string) {
  return treatmentDate.slice(0, 7);
}

function dayKeyFromDate(treatmentDate: string) {
  return treatmentDate.slice(0, 10);
}

export function formatDesignerClientMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');

  if (!year || !month) {
    return monthKey;
  }

  return `${year}년 ${Number(month)}월`;
}

export function formatDesignerClientDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];

  return `${month}.${day} (${weekday})`;
}

function categoryKeyForItem(item: DesignerClientListItem) {
  if (
    !item.isRegistered ||
    item.inviteStatus === 'pending' ||
    item.inviteStatus === 'expired'
  ) {
    return '__invite__';
  }

  const type = item.treatment?.treatment_type?.trim();

  if (!type) {
    return '기타';
  }

  return CATEGORY_META[type] ? type : '기타';
}

function categorySortIndex(categoryKey: string) {
  const index = CATEGORY_ORDER.indexOf(categoryKey as (typeof CATEGORY_ORDER)[number]);

  return index >= 0 ? index : CATEGORY_ORDER.length;
}

function buildCategorySections(items: DesignerClientListItem[]): DesignerClientCategorySection[] {
  const categoryMap = new Map<string, DesignerClientListItem[]>();

  for (const item of items) {
    const categoryKey = categoryKeyForItem(item);
    const bucket = categoryMap.get(categoryKey) ?? [];
    bucket.push(item);
    categoryMap.set(categoryKey, bucket);
  }

  return Array.from(categoryMap.entries())
    .map(([categoryKey, categoryItems]) => {
      const meta = CATEGORY_META[categoryKey] ?? CATEGORY_META.기타;

      return {
        categoryKey,
        categoryLabel: meta.label,
        icon: meta.icon,
        items: [...categoryItems].sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate)),
      };
    })
    .sort((a, b) => categorySortIndex(a.categoryKey) - categorySortIndex(b.categoryKey));
}

/** 고객 1명의 시술 목록 → 월별 · 일별 탭 · 시술 종류별 분류 */
export function groupClientItemsByMonthAndCategory(
  items: DesignerClientListItem[],
): DesignerClientMonthSection[] {
  const monthMap = new Map<string, Map<string, DesignerClientListItem[]>>();

  for (const item of items) {
    const monthKey = monthKeyFromDate(item.treatmentDate);
    const dayKey = dayKeyFromDate(item.treatmentDate);
    const monthBucket =
      monthMap.get(monthKey) ?? (() => {
        const created = new Map<string, DesignerClientListItem[]>();
        monthMap.set(monthKey, created);
        return created;
      })();

    const dayItems = monthBucket.get(dayKey) ?? [];
    dayItems.push(item);
    monthBucket.set(dayKey, dayItems);
  }

  return Array.from(monthMap.entries())
    .map(([monthKey, dayMap]) => {
      const days = Array.from(dayMap.entries())
        .map(([dayKey, dayItems]) => {
          const categories = buildCategorySections(dayItems);

          return {
            dayKey,
            dayLabel: formatDesignerClientDayLabel(dayKey),
            totalCount: dayItems.length,
            categories,
          };
        })
        .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

      const totalCount = days.reduce((sum, day) => sum + day.totalCount, 0);

      return {
        monthKey,
        monthLabel: formatDesignerClientMonthLabel(monthKey),
        totalCount,
        days,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
