import type { DesignerClientListItem } from './customer-invitations';

export type DesignerClientGroup = {
  key: string;
  customerName: string;
  items: DesignerClientListItem[];
};

function groupKeyForItem(item: DesignerClientListItem) {
  const customerId = item.treatment?.customer_id?.trim();

  if (customerId) {
    return `id:${customerId}`;
  }

  return `name:${item.customerName.trim().toLowerCase()}`;
}

/** 고객(이름·연결 ID)별로 시술 카드를 묶고, 그룹·시술 모두 최신순 정렬 */
export function groupDesignerClientListItems(items: DesignerClientListItem[]): DesignerClientGroup[] {
  const map = new Map<string, DesignerClientGroup & { latestDate: string }>();

  for (const item of items) {
    const key = groupKeyForItem(item);
    const existing = map.get(key);

    if (existing) {
      existing.items.push(item);

      if (item.treatmentDate.localeCompare(existing.latestDate) > 0) {
        existing.latestDate = item.treatmentDate;
        existing.customerName = item.customerName;
      }

      continue;
    }

    map.set(key, {
      key,
      customerName: item.customerName,
      items: [item],
      latestDate: item.treatmentDate,
    });
  }

  return Array.from(map.values())
    .map((group) => ({
      key: group.key,
      customerName: group.customerName,
      items: [...group.items].sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate)),
    }))
    .sort((a, b) => {
      const aLatest = a.items[0]?.treatmentDate ?? '';
      const bLatest = b.items[0]?.treatmentDate ?? '';

      return bLatest.localeCompare(aLatest);
    });
}
