import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import { CUSTOMER_NAME_POOL } from './demo-customer-name-pool';

export const FLEET_100_TEST_PASSWORD = 'test1234';

/** 증원 디자이너 연차 (매장당 5명 — 각 1·3·5·7·10년차 1명) */
export const FLEET_HISTORY_YEARS = [1, 3, 5, 7, 10] as const;

/** 4개 매장 × 5명 = 20명 (FLEET_100_* 이름은 하위 호환) */
export const FLEET_DESIGNERS_PER_STORE_COUNT = 5;
export const FLEET_100_COUNT = FLEET_DESIGNERS_PER_STORE_COUNT * 4;

/** 매장별 증원 디자이너 (매장당 5명) */
export const FLEET_100_DESIGNERS_PER_STORE = [
  { storeId: 'virtual-store-hot-gangnam', count: FLEET_DESIGNERS_PER_STORE_COUNT },
  { storeId: 'virtual-store-hot-hongdae', count: FLEET_DESIGNERS_PER_STORE_COUNT },
  { storeId: 'virtual-store-hot-seongsu', count: FLEET_DESIGNERS_PER_STORE_COUNT },
  { storeId: 'virtual-store-hot-busan', count: FLEET_DESIGNERS_PER_STORE_COUNT },
] as const;

const FLEET_DESIGNER_NAME_POOL = [
  '박서연',
  '김도하',
  '이채린',
  '정민우',
  '한소율',
  '오준혁',
  '윤가은',
  '강시온',
  '임하늘',
  '송유진',
  '류태민',
  '문예은',
  '배지호',
  '남다연',
  '조현서',
  '신아린',
  '유태양',
  '허채우',
  '노서현',
  '진민지',
  '표건',
  '석하윤',
  '탁지원',
  '길수연',
  '도윤서',
  '마예준',
  '방채린',
  '변도윤',
  '석민아',
  '옥지후',
  '육서아',
  '감현우',
  '제갈하린',
  '선우태오',
  '황유나',
  '김라온',
  '이수빈',
  '박건희',
  '최유림',
  '정하람',
  '한지훈',
  '오서진',
  '윤나윤',
  '강민지',
  '임채우',
  '서예준',
  '안시온',
  '권도훈',
  '홍가영',
] as const;

const fleetCustomersCache = new Map<string, BetaTestAccount[]>();

function pad3(value: number) {
  return String(value).padStart(3, '0');
}

export function isFleetProfileKey(profileKey: string) {
  return profileKey.startsWith('fleet-');
}

/** 디자이너별 결정적 난수 (시드·로그인 안정) */
function hashDesignerSlot(slot: number, salt: number) {
  return ((slot * 1_103 + salt * 97 + 17) % 10_007) >>> 0;
}

/** 1·3·5·7·10년차 순환 (매장 내 5명이 각 연차 1명) */
export function resolveFleetHistoryYears(slot: number): number {
  return FLEET_HISTORY_YEARS[(slot - 1) % FLEET_HISTORY_YEARS.length] ?? 1;
}

/** 경력 기간 × 주 1명 신규 유입 */
export function customerCountForFleetDesigner(historyYears: number) {
  return 52 * historyYears;
}

function resolveFleetDailyRange(slot: number) {
  const hash = hashDesignerSlot(slot, 11);
  const dailyMin = 3;
  const dailyMax = 10;
  const span = dailyMax - dailyMin + 1;
  const effectiveMax = dailyMin + (hash % span);

  return { dailyMin, dailyMax: Math.max(dailyMin, effectiveMax) };
}

function buildFleetCustomers(slot: number, count: number): BetaTestAccount[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `test-fleet-${pad3(slot)}-customer-${pad3(index + 1)}`,
    email: `test-fleet-${pad3(slot)}-customer-${index + 1}@hair.app`,
    name: CUSTOMER_NAME_POOL[(slot + index) % CUSTOMER_NAME_POOL.length],
    password: FLEET_100_TEST_PASSWORD,
    role: 'customer' as const,
  }));
}

/** 증원 프로필 고객 — 시드·검색 시에만 생성 (앱 시작 시 2만+ 명 생성 방지) */
export function getFleetDesignerCustomers(profileKey: string): BetaTestAccount[] {
  const cached = fleetCustomersCache.get(profileKey);

  if (cached) {
    return cached;
  }

  const slot = Number(profileKey.replace('fleet-', ''));

  if (!Number.isFinite(slot) || slot < 1) {
    return [];
  }

  const historyYears = resolveFleetHistoryYears(slot);
  const customers = buildFleetCustomers(slot, customerCountForFleetDesigner(historyYears));
  fleetCustomersCache.set(profileKey, customers);

  return customers;
}

export type Fleet100DesignerDefinition = {
  slot: number;
  storeId: string;
  designer: BetaTestAccount;
  historyYears: number;
  profileKey: string;
  loginLabel: string;
  customerCount: number;
  dailyMin: number;
  dailyMax: number;
};

function buildFleetDesignerDefinition(slot: number, storeId: string): Fleet100DesignerDefinition {
  const historyYears = resolveFleetHistoryYears(slot);
  const customerCount = customerCountForFleetDesigner(historyYears);
  const { dailyMin, dailyMax } = resolveFleetDailyRange(slot);
  const designerName = FLEET_DESIGNER_NAME_POOL[(slot - 1) % FLEET_DESIGNER_NAME_POOL.length] ?? `증원 ${slot}`;
  const profileKey = `fleet-${pad3(slot)}`;
  const yearLabel = `${historyYears}년차`;

  const designer: BetaTestAccount = {
    id: `test-fleet-${pad3(slot)}`,
    email: `test-fleet-${pad3(slot)}@hair.app`,
    name: `${designerName} (${yearLabel})`,
    password: FLEET_100_TEST_PASSWORD,
    role: 'designer',
  };

  return {
    slot,
    storeId,
    designer,
    historyYears,
    profileKey,
    loginLabel: `증원 · ${designerName} · ${yearLabel}`,
    customerCount,
    dailyMin,
    dailyMax,
  };
}

let fleetSlot = 0;

export const FLEET_100_DESIGNER_DEFINITIONS: Fleet100DesignerDefinition[] =
  FLEET_100_DESIGNERS_PER_STORE.flatMap(({ storeId, count }) =>
    Array.from({ length: count }, () => {
      fleetSlot += 1;

      return buildFleetDesignerDefinition(fleetSlot, storeId);
    }),
  );

export const FLEET_100_DESIGNER_IDS = FLEET_100_DESIGNER_DEFINITIONS.map((item) => item.designer.id);

export const FLEET_100_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] =
  FLEET_100_DESIGNER_DEFINITIONS.map((item) => ({
    key: item.profileKey,
    designer: item.designer,
    customers: [],
    customerCount: item.customerCount,
    historyYears: item.historyYears,
    dailyMin: item.dailyMin,
    dailyMax: item.dailyMax,
    treatmentIdPrefix: `fleet-${pad3(item.slot)}-treatment-`,
    paymentIdPrefix: `fleet-${pad3(item.slot)}-payment-`,
    visitCycleMode: true,
    weeklyNewCustomers: 1,
  }));

export const FLEET_100_DESIGNERS_PUBLIC = FLEET_100_DESIGNER_DEFINITIONS.map((item) => {
  const displayName =
    FLEET_DESIGNER_NAME_POOL[(item.slot - 1) % FLEET_DESIGNER_NAME_POOL.length] ??
    `증원 ${item.slot}`;

  return {
    id: item.designer.id,
    email: item.designer.email,
    password: FLEET_100_TEST_PASSWORD,
    name: item.designer.name,
    displayName,
    profileKey: item.profileKey,
    loginLabel: item.loginLabel,
    storeId: item.storeId,
    historyYears: item.historyYears,
  };
});

/** 디자이너 계정만 (고객 2만+ 명은 로그인 목록에 포함하지 않음) */
export const FLEET_100_DESIGNER_ACCOUNTS: BetaTestAccount[] = FLEET_100_DESIGNER_DEFINITIONS.map(
  (item) => item.designer,
);

/** 매장 ID → 증원 디자이너 ID 목록 */
export const FLEET_100_DESIGNER_IDS_BY_STORE = Object.fromEntries(
  FLEET_100_DESIGNERS_PER_STORE.map(({ storeId }) => [
    storeId,
    FLEET_100_DESIGNER_DEFINITIONS.filter((item) => item.storeId === storeId).map(
      (item) => item.designer.id,
    ),
  ]),
) as Record<string, string[]>;

/** @deprecated FLEET_100_* 별칭 */
export const EXPANDED_STORE_DESIGNER_COUNT = FLEET_100_COUNT;
export const EXPANDED_STORE_DESIGNER_DEFINITIONS = FLEET_100_DESIGNER_DEFINITIONS;
export const EXPANDED_STORE_DESIGNER_IDS = FLEET_100_DESIGNER_IDS;
export const EXPANDED_STORE_DESIGNER_PROFILE_CONFIGS = FLEET_100_PROFILE_CONFIGS;
export const EXPANDED_STORE_DESIGNERS_PUBLIC = FLEET_100_DESIGNERS_PUBLIC;
export const EXPANDED_STORE_DESIGNER_ACCOUNTS = FLEET_100_DESIGNER_ACCOUNTS;
export const EXPANDED_DESIGNER_IDS_BY_STORE = FLEET_100_DESIGNER_IDS_BY_STORE;
export const EXPANDED_DESIGNERS_PER_STORE = FLEET_100_DESIGNERS_PER_STORE;
