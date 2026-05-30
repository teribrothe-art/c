import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isAccumulatedTestCustomerId,
  isAccumulatedTestDesignerId,
} from './demo-accumulated-ids';

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

export async function mergeAccumulatedDesignerRelationships() {
  const { getAccumulatedTestProfiles } = await import('./demo-accumulated-test-seeds');
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  const items: { designer_id: string; customer_id: string }[] = raw ? JSON.parse(raw) : [];
  let changed = false;

  const existingPairs = new Set(
    items.map((item) => `${item.designer_id}:${item.customer_id}`),
  );

  for (const profile of getAccumulatedTestProfiles()) {
    for (const customer of profile.customers) {
      const pairKey = `${profile.designer.id}:${customer.id}`;

      if (!existingPairs.has(pairKey)) {
        items.push({ designer_id: profile.designer.id, customer_id: customer.id });
        existingPairs.add(pairKey);
        changed = true;
      }
    }
  }

  if (changed) {
    await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
  }
}

/** AsyncStorage에서 누적 테스트 디자이너·고객 관계 제거 */
export async function stripAccumulatedRelationshipsFromStorage(): Promise<number> {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);

  if (!raw) {
    return 0;
  }

  const items = JSON.parse(raw) as { designer_id: string; customer_id: string }[];
  const cleaned = items.filter(
    (item) =>
      !isAccumulatedTestDesignerId(item.designer_id) &&
      !isAccumulatedTestCustomerId(item.customer_id),
  );
  const removed = items.length - cleaned.length;

  if (removed > 0) {
    await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(cleaned));
  }

  return removed;
}
