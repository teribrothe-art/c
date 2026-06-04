import { BETA_DESIGNERS } from './beta-test-accounts';
import { getAccumulatedTestProfileConfigs } from './demo-accumulated-test-accounts';

/** 데모 디자이너 연동 가입 고객 (김지원·박민지·이서연·서정현) */
const DEMO_DESIGNER_CUSTOMER_COUNT = 4;

const BETA_DESIGNER_CUSTOMER_COUNT = 1;

let customerCountMapCache: Map<string, number> | null = null;

function buildDemoDesignerCustomerCountMap() {
  const map = new Map<string, number>();

  map.set('demo-designer-local', DEMO_DESIGNER_CUSTOMER_COUNT);

  for (const designer of BETA_DESIGNERS) {
    map.set(designer.id, BETA_DESIGNER_CUSTOMER_COUNT);
  }

  for (const config of getAccumulatedTestProfileConfigs()) {
    map.set(config.designer.id, config.customers.length);
  }

  return map;
}

function getDemoDesignerCustomerCountMap() {
  if (!customerCountMapCache) {
    customerCountMapCache = buildDemoDesignerCustomerCountMap();
  }

  return customerCountMapCache;
}

export function getDemoDesignerCustomerCount(designerId: string) {
  return getDemoDesignerCustomerCountMap().get(designerId) ?? 0;
}

export function formatDemoDesignerCustomerCount(count: number) {
  return `고객 ${count.toLocaleString('ko-KR')}명`;
}
