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

const EXPANDED_HISTORY_YEAR_PATTERN: (1 | 2)[] = [
  1, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1,
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function hashDesignerSlot(slot: number, salt: number) {
  return ((slot * 1_103 + salt * 97 + 17) % 10_007) >>> 0;
}

function resolveExpandedHistoryYears(slot: number): 1 | 2 {
  return EXPANDED_HISTORY_YEAR_PATTERN[slot - 1] ?? (((slot % 2) + 1) as 1 | 2);
}

function customerCountForTier(slot: number, historyYears: 1 | 2) {
  const hash = hashDesignerSlot(slot, 7);

  if (historyYears === 1) {
    return 28 + (hash % 15);
  }

  return 36 + (hash % 18);
}

function buildExpandedDesignerPublic(slot: number, storeId: string) {
  const historyYears = resolveExpandedHistoryYears(slot);
  const designerName = EXPANDED_DESIGNER_NAME_POOL[slot - 1] ?? `증원 디자이너 ${slot}`;
  const profileKey = `exp-${pad2(slot)}`;
  const yearLabel = historyYears === 1 ? '1년차' : '2년차';

  return {
    id: `test-designer-exp-${pad2(slot)}`,
    email: `test-designer-exp-${pad2(slot)}@hair.app`,
    password: EXPANDED_TEST_PASSWORD,
    name: `${designerName} (${yearLabel})`,
    profileKey,
    loginLabel: `증원 · ${designerName} · ${yearLabel}`,
    storeId,
    historyYears,
  };
}

/** 매장 ID → 증원 디자이너 ID (고객 배열 생성 없음) */
export const EXPANDED_DESIGNER_IDS_BY_STORE: Record<string, string[]> = (() => {
  let slot = 0;

  return Object.fromEntries(
    EXPANDED_DESIGNERS_PER_STORE.map(({ storeId, count }) => {
      const ids: string[] = [];

      for (let index = 0; index < count; index += 1) {
        slot += 1;
        ids.push(`test-designer-exp-${pad2(slot)}`);
      }

      return [storeId, ids];
    }),
  );
})();

export const EXPANDED_STORE_DESIGNERS_PUBLIC = (() => {
  let slot = 0;

  return EXPANDED_DESIGNERS_PER_STORE.flatMap(({ storeId, count }) =>
    Array.from({ length: count }, () => {
      slot += 1;
      return buildExpandedDesignerPublic(slot, storeId);
    }),
  );
})();

export const EXPANDED_STORE_DESIGNER_IDS = EXPANDED_STORE_DESIGNERS_PUBLIC.map((item) => item.id);

export type ExpandedStoreDesignerDefinition = {
  slot: number;
  storeId: string;
  designer: BetaTestAccount;
  historyYears: 1 | 2;
  profileKey: string;
  loginLabel: string;
  customers: BetaTestAccount[];
};

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

function buildExpandedDesignerDefinition(
  slot: number,
  storeId: string,
): ExpandedStoreDesignerDefinition {
  const historyYears = resolveExpandedHistoryYears(slot);
  const customerCount = customerCountForTier(slot, historyYears);
  const publicDesigner = buildExpandedDesignerPublic(slot, storeId);

  const designer: BetaTestAccount = {
    id: publicDesigner.id,
    email: publicDesigner.email,
    name: publicDesigner.name,
    password: EXPANDED_TEST_PASSWORD,
    role: 'designer',
  };

  return {
    slot,
    storeId,
    designer,
    historyYears,
    profileKey: publicDesigner.profileKey,
    loginLabel: publicDesigner.loginLabel,
    customers: buildExpandedCustomers(slot, customerCount),
  };
}

let expandedDefinitionsCache: ExpandedStoreDesignerDefinition[] | null = null;

export function getExpandedStoreDesignerDefinitions(): ExpandedStoreDesignerDefinition[] {
  if (expandedDefinitionsCache) {
    return expandedDefinitionsCache;
  }

  let slot = 0;

  expandedDefinitionsCache = EXPANDED_DESIGNERS_PER_STORE.flatMap(({ storeId, count }) =>
    Array.from({ length: count }, () => {
      slot += 1;
      return buildExpandedDesignerDefinition(slot, storeId);
    }),
  );

  return expandedDefinitionsCache;
}

let expandedProfileConfigsCache: AccumulatedSeedProfileConfig[] | null = null;

export function getExpandedStoreDesignerProfileConfigs(): AccumulatedSeedProfileConfig[] {
  if (expandedProfileConfigsCache) {
    return expandedProfileConfigsCache;
  }

  expandedProfileConfigsCache = getExpandedStoreDesignerDefinitions().map((item) => {
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

  return expandedProfileConfigsCache;
}

let expandedAccountsCache: BetaTestAccount[] | null = null;

export function getExpandedStoreDesignerAccounts(): BetaTestAccount[] {
  if (expandedAccountsCache) {
    return expandedAccountsCache;
  }

  expandedAccountsCache = getExpandedStoreDesignerDefinitions().flatMap((item) => [
    item.designer,
    ...item.customers,
  ]);

  return expandedAccountsCache;
}

/** @deprecated getExpandedStoreDesignerDefinitions() */
export const EXPANDED_STORE_DESIGNER_DEFINITIONS = new Proxy([] as ExpandedStoreDesignerDefinition[], {
  get(_target, prop) {
    const definitions = getExpandedStoreDesignerDefinitions();
    const value = Reflect.get(definitions, prop);
    return typeof value === 'function' ? value.bind(definitions) : value;
  },
});

/** @deprecated getExpandedStoreDesignerProfileConfigs() */
export const EXPANDED_STORE_DESIGNER_PROFILE_CONFIGS = new Proxy([] as AccumulatedSeedProfileConfig[], {
  get(_target, prop) {
    const configs = getExpandedStoreDesignerProfileConfigs();
    const value = Reflect.get(configs, prop);
    return typeof value === 'function' ? value.bind(configs) : value;
  },
});

/** @deprecated getExpandedStoreDesignerAccounts() */
export const EXPANDED_STORE_DESIGNER_ACCOUNTS = new Proxy([] as BetaTestAccount[], {
  get(_target, prop) {
    const accounts = getExpandedStoreDesignerAccounts();
    const value = Reflect.get(accounts, prop);
    return typeof value === 'function' ? value.bind(accounts) : value;
  },
});

export const EXPANDED_STORE_DESIGNER_COUNT = EXPANDED_STORE_DESIGNERS_PUBLIC.length;
