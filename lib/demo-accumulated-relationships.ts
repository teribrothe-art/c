import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACCUMULATED_TEST_CUSTOMERS,
  ACCUMULATED_TEST_DESIGNER,
} from './demo-accumulated-test-accounts';

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

export async function mergeAccumulatedDesignerRelationships() {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  const items: { designer_id: string; customer_id: string }[] = raw ? JSON.parse(raw) : [];
  let changed = false;

  for (const customer of ACCUMULATED_TEST_CUSTOMERS) {
    const exists = items.some(
      (item) =>
        item.designer_id === ACCUMULATED_TEST_DESIGNER.id && item.customer_id === customer.id,
    );

    if (!exists) {
      items.push({ designer_id: ACCUMULATED_TEST_DESIGNER.id, customer_id: customer.id });
      changed = true;
    }
  }

  if (changed) {
    await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
  }
}
