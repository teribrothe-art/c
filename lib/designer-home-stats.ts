import type { DesignerClientListItem } from './customer-invitations';

/** 홈·요약용 고유 고객 수 (customer_id 또는 이름 기준) */
export function countUniqueDesignerCustomers(items: DesignerClientListItem[]) {
  const keys = new Set<string>();

  for (const item of items) {
    const customerId = item.treatment?.customer_id?.trim();

    if (customerId) {
      keys.add(`id:${customerId}`);
      continue;
    }

    const name = item.customerName.trim().toLowerCase();

    if (name) {
      keys.add(`name:${name}`);
    }
  }

  return keys.size;
}
