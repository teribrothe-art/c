import { BETA_DESIGNERS } from './beta-test-accounts';
import { getAccumulatedProfileCustomerCount } from './demo-accumulated-profile-customers';
import {
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  ACCUMULATED_TEST_PROFILE_CONFIGS,
} from './demo-accumulated-test-accounts';

/** 데모 디자이너 연동 가입 고객 (김지원·박민지·이서연·서정현) */
const DEMO_DESIGNER_CUSTOMER_COUNT = 4;

function buildDemoDesignerCustomerCountMap() {
  const map = new Map<string, number>();

  map.set('demo-designer-local', DEMO_DESIGNER_CUSTOMER_COUNT);

  for (const config of ACCUMULATED_TEST_PROFILE_CONFIGS) {
    map.set(config.designer.id, getAccumulatedProfileCustomerCount(config));
  }

  return map;
}

let demoDesignerCustomerCountCache: Map<string, number> | null = null;

function ensureDemoDesignerCustomerCountMap() {
  if (!demoDesignerCustomerCountCache) {
    demoDesignerCustomerCountCache = buildDemoDesignerCustomerCountMap();
  }

  return demoDesignerCustomerCountCache;
}

/** @deprecated ensureDemoDesignerCustomerCountMap() 내부 사용 */
export function getDemoDesignerCustomerCountMap() {
  return ensureDemoDesignerCustomerCountMap();
}

export function getDemoDesignerCustomerCount(designerId: string) {
  return ensureDemoDesignerCustomerCountMap().get(designerId) ?? 0;
}

/** 테스트 로그인·본사/매장 로스터 — 연동 고객 1명 이상만 포함 */
export function isDemoDesignerIncludedInTestAccounts(designerId: string) {
  return getDemoDesignerCustomerCount(designerId) > 0;
}

export function filterDemoDesignersWithCustomers<T extends { id: string }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => isDemoDesignerIncludedInTestAccounts(item.id));
}

const ALL_DEMO_TEST_DESIGNER_IDS = [
  'demo-designer-local',
  ...BETA_DESIGNERS.map((designer) => designer.id),
  ...ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) => designer.id),
];

/** UI·로그인 목록 표시용 — 고객 없는 디자이너 제외 */
export const INCLUDED_DEMO_TEST_DESIGNER_COUNT = ALL_DEMO_TEST_DESIGNER_IDS.filter(
  isDemoDesignerIncludedInTestAccounts,
).length;

export function formatDemoDesignerCustomerCount(count: number) {
  return `고객 ${count.toLocaleString('ko-KR')}명`;
}
