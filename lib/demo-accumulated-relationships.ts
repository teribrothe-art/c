import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACCUMULATED_TEST_PROFILES } from './demo-accumulated-test-seeds';

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

export async function mergeAccumulatedDesignerRelationships() {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  const items: { designer_id: string; customer_id: string }[] = raw ? JSON.parse(raw) : [];
  let changed = false;

  for (const profile of ACCUMULATED_TEST_PROFILES) {
    for (const customer of profile.customers) {
      const exists = items.some(
        (item) =>
          item.designer_id === profile.designer.id && item.customer_id === customer.id,
      );

      if (!exists) {
        items.push({ designer_id: profile.designer.id, customer_id: customer.id });
        changed = true;
      }
    }
  }

  if (changed) {
    await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
  }
}
