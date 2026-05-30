import { getDesignerLinkedCustomerLoginSources } from './demo-designer-linked-customers';
import { getAccumulatedTestProfiles } from './demo-accumulated-test-seeds';

function countUniqueCustomersInTreatments(
  treatments: { customer_id?: string | null; customer_name?: string | null }[],
) {
  const ids = new Set<string>();

  for (const treatment of treatments) {
    const key = treatment.customer_id ?? treatment.customer_name;

    if (key) {
      ids.add(key);
    }
  }

  return ids.size;
}

function buildDemoDesignerCustomerCountMap() {
  const map = new Map<string, number>();

  for (const source of getDesignerLinkedCustomerLoginSources()) {
    map.set(source.designerId, source.customers.length);
  }

  for (const profile of getAccumulatedTestProfiles()) {
    const linkedCount = profile.customers.length;
    const activeCount = countUniqueCustomersInTreatments(profile.treatments);
    map.set(profile.designer.id, activeCount > 0 ? activeCount : linkedCount);
  }

  return map;
}

let customerCountMapCache: Map<string, number> | null = null;

function getDemoDesignerCustomerCountMap() {
  if (!customerCountMapCache) {
    customerCountMapCache = buildDemoDesignerCustomerCountMap();
  }

  return customerCountMapCache;
}

/** 누적 시드 재빌드 후 고객수 캐시 초기화 */
export function clearDemoDesignerCustomerCountCache() {
  customerCountMapCache = null;
}

export function getDemoDesignerCustomerCount(designerId: string) {
  return getDemoDesignerCustomerCountMap().get(designerId) ?? 0;
}

export function formatDemoDesignerCustomerCount(count: number) {
  return `고객 ${count.toLocaleString('ko-KR')}명`;
}

export { countUniqueCustomersInTreatments };
