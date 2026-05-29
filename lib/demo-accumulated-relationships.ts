import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAccumulatedTestProfiles } from './demo-accumulated-test-seeds';

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

export async function mergeAccumulatedDesignerRelationships() {
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
