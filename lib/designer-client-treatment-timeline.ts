import type { DesignerClientListItem } from './customer-invitations';
import { TREATMENT_TYPE_OPTIONS } from './treatment-options';

export type DesignerClientCategorySection = {
  categoryKey: string;
  categoryLabel: string;
  icon: string;
  items: DesignerClientListItem[];
};

export type DesignerClientMonthSection = {
  monthKey: string;
  monthLabel: string;
  totalCount: number;
  categories: DesignerClientCategorySection[];
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

for (const option of TREATMENT_TYPE_OPTIONS) {
  CATEGORY_META[option.label] = { label: option.label, icon: option.icon };
}

function monthKeyFromDate(treatmentDate: string) {
  return treatmentDate.slice(0, 7);
}

export function formatDesignerClientMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');

  if (!year || !month) {
    return monthKey;
  }

  return `${year}년 ${Number(month)}월`;
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

/** 고객 1명의 시술 목록 → 월별 · 시술 종류별 분류 */
export function groupClientItemsByMonthAndCategory(
  items: DesignerClientListItem[],
): DesignerClientMonthSection[] {
  const monthMap = new Map<
    string,
    { monthKey: string; categoryMap: Map<string, DesignerClientListItem[]> }
  >();

  for (const item of items) {
    const monthKey = monthKeyFromDate(item.treatmentDate);
    const categoryKey = categoryKeyForItem(item);
    const monthBucket =
      monthMap.get(monthKey) ??
      (() => {
        const created = { monthKey, categoryMap: new Map<string, DesignerClientListItem[]>() };
        monthMap.set(monthKey, created);
        return created;
      })();

    const categoryItems = monthBucket.categoryMap.get(categoryKey) ?? [];
    categoryItems.push(item);
    monthBucket.categoryMap.set(categoryKey, categoryItems);
  }

  return Array.from(monthMap.values())
    .map((month) => {
      const categories = Array.from(month.categoryMap.entries())
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

      const totalCount = categories.reduce((sum, category) => sum + category.items.length, 0);

      return {
        monthKey: month.monthKey,
        monthLabel: formatDesignerClientMonthLabel(month.monthKey),
        totalCount,
        categories,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
