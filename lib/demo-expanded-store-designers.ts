import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
const EXPANDED_TEST_PASSWORD = 'test1234';

/** 매장별 증원 디자이너 수 (총 15명) */
export const EXPANDED_DESIGNERS_PER_STORE = [
  { storeId: 'virtual-store-hot-gangnam', count: 4 },
  { storeId: 'virtual-store-hot-hongdae', count: 4 },
  { storeId: 'virtual-store-hot-seongsu', count: 4 },
  { storeId: 'virtual-store-hot-busan', count: 3 },
] as const;

const EXPANDED_DESIGNER_NAME_POOL = [
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
] as const;

const EXTRA_CUSTOMER_NAMES = [
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
] as const;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/** 디자이너별 결정적 난수 (시드·로그인 안정) */
function hashDesignerSlot(slot: number, salt: number) {
  return ((slot * 1_103 + salt * 97 + 17) % 10_007) >>> 0;
}

/** 1년차~2년차 사이 프로필 (15명: 1년차 7 · 2년차 8, slot마다 고정) */
const EXPANDED_HISTORY_YEAR_PATTERN: (1 | 2)[] = [
  1, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1,
];

function resolveExpandedHistoryYears(slot: number): 1 | 2 {
  return EXPANDED_HISTORY_YEAR_PATTERN[slot - 1] ?? ((slot % 2) + 1) as 1 | 2;
}

function customerCountForTier(slot: number, historyYears: 1 | 2) {
  const hash = hashDesignerSlot(slot, 7);

  if (historyYears === 1) {
    return 28 + (hash % 15);
  }

  return 36 + (hash % 18);
}

function buildExpandedCustomers(slot: number, count: number): BetaTestAccount[] {
  return Array.from({ length: count }, (_, index) => {
    const name =
      EXTRA_CUSTOMER_NAMES[(slot + index) % EXTRA_CUSTOMER_NAMES.length] ??
      `고객${index + 1}`;

    return {
      id: `test-exp-${pad2(slot)}-customer-${pad2(index + 1)}`,
      email: `test-exp-${pad2(slot)}-customer-${index + 1}@hair.app`,
      name,
      password: EXPANDED_TEST_PASSWORD,
      role: 'customer' as const,
    };
  });
}

export type ExpandedStoreDesignerDefinition = {
  slot: number;
  storeId: string;
  designer: BetaTestAccount;
  historyYears: 1 | 2;
  profileKey: string;
  loginLabel: string;
  customers: BetaTestAccount[];
};

function buildExpandedDesignerDefinition(
  slot: number,
  storeId: string,
): ExpandedStoreDesignerDefinition {
  const historyYears = resolveExpandedHistoryYears(slot);
  const customerCount = customerCountForTier(slot, historyYears);
  const designerName = EXPANDED_DESIGNER_NAME_POOL[slot - 1] ?? `증원 디자이너 ${slot}`;
  const profileKey = `exp-${pad2(slot)}`;
  const yearLabel = historyYears === 1 ? '1년차' : '2년차';

  const designer: BetaTestAccount = {
    id: `test-designer-exp-${pad2(slot)}`,
    email: `test-designer-exp-${pad2(slot)}@hair.app`,
    name: `${designerName} (${yearLabel})`,
    password: EXPANDED_TEST_PASSWORD,
    role: 'designer',
  };

  return {
    slot,
    storeId,
    designer,
    historyYears,
    profileKey,
    loginLabel: `증원 · ${designerName} · ${yearLabel}`,
    customers: buildExpandedCustomers(slot, customerCount),
  };
}

let expandedSlot = 0;

export const EXPANDED_STORE_DESIGNER_DEFINITIONS: ExpandedStoreDesignerDefinition[] =
  EXPANDED_DESIGNERS_PER_STORE.flatMap(({ storeId, count }) =>
    Array.from({ length: count }, () => {
      expandedSlot += 1;

      return buildExpandedDesignerDefinition(expandedSlot, storeId);
    }),
  );

export const EXPANDED_STORE_DESIGNER_IDS = EXPANDED_STORE_DESIGNER_DEFINITIONS.map(
  (item) => item.designer.id,
);

export const EXPANDED_STORE_DESIGNER_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] =
  EXPANDED_STORE_DESIGNER_DEFINITIONS.map((item) => {
    const isOneYear = item.historyYears === 1;

    return {
      key: item.profileKey,
      designer: item.designer,
      customers: item.customers,
      historyYears: item.historyYears,
      dailyMin: isOneYear ? 3 : 4,
      dailyMax: isOneYear ? 5 : 6,
      treatmentIdPrefix: `accum-${item.profileKey}-treatment-`,
      paymentIdPrefix: `accum-${item.profileKey}-payment-`,
      visitCycleMode: true,
    };
  });

export const EXPANDED_STORE_DESIGNERS_PUBLIC = EXPANDED_STORE_DESIGNER_DEFINITIONS.map(
  (item) => ({
    id: item.designer.id,
    email: item.designer.email,
    password: EXPANDED_TEST_PASSWORD,
    name: item.designer.name,
    profileKey: item.profileKey,
    loginLabel: item.loginLabel,
    storeId: item.storeId,
    historyYears: item.historyYears,
  }),
);

export const EXPANDED_STORE_DESIGNER_ACCOUNTS: BetaTestAccount[] = [
  ...EXPANDED_STORE_DESIGNER_DEFINITIONS.map((item) => item.designer),
  ...EXPANDED_STORE_DESIGNER_DEFINITIONS.flatMap((item) => item.customers),
];

/** 매장 ID → 증원 디자이너 ID 목록 */
export const EXPANDED_DESIGNER_IDS_BY_STORE = Object.fromEntries(
  EXPANDED_DESIGNERS_PER_STORE.map(({ storeId }) => [
    storeId,
    EXPANDED_STORE_DESIGNER_DEFINITIONS.filter((item) => item.storeId === storeId).map(
      (item) => item.designer.id,
    ),
  ]),
) as Record<string, string[]>;
