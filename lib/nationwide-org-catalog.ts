import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';
import type { OrgStore } from './org-store-affiliation';

export const NATIONWIDE_STORE_COUNT = 600;
export const NATIONWIDE_DESIGNER_COUNT = 1000;
export const NATIONWIDE_TEST_PASSWORD = 'test1234';

/** 레거시 4곳 → 전국 카탈로그 1~4번 매장 ID */
export const LEGACY_STORE_ID_TO_NATIONWIDE: Record<string, string> = {
  'virtual-store-hot-gangnam': 'virtual-store-nw-0001',
  'virtual-store-hot-hongdae': 'virtual-store-nw-0002',
  'virtual-store-hot-seongsu': 'virtual-store-nw-0003',
  'virtual-store-hot-busan': 'virtual-store-nw-0004',
};

/** 레거시 디자이너 — 전국 1~4번 매장 소속 */
export const LEGACY_DESIGNER_IDS_BY_STORE: Record<string, readonly string[]> = {
  'virtual-store-nw-0001': ['demo-designer-local', 'beta-designer-01', 'beta-designer-02'],
  'virtual-store-nw-0002': ['beta-designer-03', 'beta-designer-04'],
  'virtual-store-nw-0003': ['beta-designer-05', 'test-designer-1y'],
  'virtual-store-nw-0004': ['test-designer-3y', 'test-designer-accum-3y', 'test-designer-accum-5y'],
};

type RegionSpec = {
  region: string;
  hotPlaces: string[];
  districtNames: string[];
  weight: number;
};

const REGION_SPECS: RegionSpec[] = [
  {
    region: '서울',
    hotPlaces: ['역삼·청담·압구정', '홍익대·연남동', '성수·뚝섬', '강북·수유', '잠실·송파', '여의도·마포'],
    districtNames: ['강남', '마포', '성동', '송파', '용산', '서초', '영등포', '관악', '강서', '노원'],
    weight: 28,
  },
  {
    region: '경기·인천',
    hotPlaces: ['판교·분당', '수원·영통', '일산·킨텍스', '부평·송도', '안양·평촌', '김포·일산'],
    districtNames: ['수원', '성남', '고양', '용인', '부천', '안산', '남양주', '화성', '평택', '인천'],
    weight: 22,
  },
  {
    region: '부산·울산·경남',
    hotPlaces: ['해운대·광안리', '서면·전포', '센텀', '울산 삼산', '창원·마산', '김해·장유'],
    districtNames: ['해운대', '부산진', '수영', '울산', '창원', '김해', '양산', '거제'],
    weight: 12,
  },
  {
    region: '대구·경북',
    hotPlaces: ['동성로·반월당', '수성·범어', '포항·경주', '구미·김천', '안동·상주'],
    districtNames: ['대구', '포항', '구미', '경주', '안동', '김천', '상주'],
    weight: 8,
  },
  {
    region: '대전·세종·충청',
    hotPlaces: ['둔산·유성', '세종·나성', '천안·아산', '청주·상당', '충주·제천'],
    districtNames: ['대전', '세종', '천안', '청주', '아산', '충주', '제천'],
    weight: 10,
  },
  {
    region: '광주·전라',
    hotPlaces: ['충장로·상무', '전주·객사', '여수·순천', '목포·무안', '익산·군산'],
    districtNames: ['광주', '전주', '여수', '순천', '목포', '익산', '군산'],
    weight: 8,
  },
  {
    region: '강원·제주',
    hotPlaces: ['춘천·명동', '강릉·경포', '원주·단구', '제주·연동', '서귀포·중문'],
    districtNames: ['춘천', '강릉', '원주', '제주', '서귀포'],
    weight: 6,
  },
  {
    region: '기타',
    hotPlaces: ['전국 상권', '역세권', '대학가', '주택단지', '신도시'],
    districtNames: ['전국'],
    weight: 6,
  },
];

const DESIGNER_NAME_POOL = [
  '김서연',
  '이도하',
  '박채린',
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
  '황유나',
  '김나래',
  '이준호',
  '박서윤',
  '최민서',
  '정다은',
  '한승우',
  '오지민',
] as const;

const CUSTOMER_NAME_POOL = [
  '김나래',
  '이준호',
  '박서윤',
  '최민서',
  '정다은',
  '한승우',
  '오지민',
  '윤하린',
  '강태오',
  '임소연',
  '송현우',
  '류채원',
  '문지후',
  '배수아',
  '남건우',
  '조예린',
  '홍도윤',
  '권시우',
  '서유진',
  '안지원',
] as const;

const FLAGSHIP_STORES: Pick<OrgStore, 'id' | 'name' | 'region' | 'hotPlace'>[] = [
  {
    id: 'virtual-store-nw-0001',
    name: '강남 플랜비',
    region: '서울 강남',
    hotPlace: '역삼·청담·압구정 상권',
  },
  {
    id: 'virtual-store-nw-0002',
    name: '홍대·연남 플랜비',
    region: '서울 마포',
    hotPlace: '홍익대·연남동·망원 상권',
  },
  {
    id: 'virtual-store-nw-0003',
    name: '성수 플랜비',
    region: '서울 성동',
    hotPlace: '성수·뚝섬 카페·살롱 거리',
  },
  {
    id: 'virtual-store-nw-0004',
    name: '해운대·광안리 플랜비',
    region: '부산 해운대',
    hotPlace: '해운대·광안리·센텀',
  },
];

function pad4(value: number) {
  return String(value).padStart(4, '0');
}

function hashSlot(slot: number, salt: number) {
  return ((slot * 1_103 + salt * 97 + 17) % 10_007) >>> 0;
}

function distributeStoreCounts(total: number, specs: RegionSpec[]) {
  const weightSum = specs.reduce((sum, spec) => sum + spec.weight, 0);
  const counts = specs.map((spec) => Math.floor((total * spec.weight) / weightSum));
  let assigned = counts.reduce((sum, count) => sum + count, 0);

  for (let index = 0; assigned < total; index += 1) {
    counts[index % counts.length] += 1;
    assigned += 1;
  }

  return counts;
}

function resolveRegionForStoreIndex(storeIndex: number) {
  const counts = distributeStoreCounts(NATIONWIDE_STORE_COUNT - FLAGSHIP_STORES.length, REGION_SPECS);
  let cursor = FLAGSHIP_STORES.length + 1;

  for (let regionIndex = 0; regionIndex < REGION_SPECS.length; regionIndex += 1) {
    const spec = REGION_SPECS[regionIndex];
    const count = counts[regionIndex];

    if (storeIndex >= cursor && storeIndex < cursor + count) {
      const localIndex = storeIndex - cursor;
      const district = spec.districtNames[localIndex % spec.districtNames.length];
      const hotPlace = spec.hotPlaces[localIndex % spec.hotPlaces.length];

      return {
        name: `${district} 플랜비`,
        region: spec.region === '기타' ? '전국' : `${spec.region} ${district}`,
        hotPlace: `${hotPlace} 상권`,
      };
    }

    cursor += count;
  }

  return {
    name: '전국 플랜비',
    region: '전국',
    hotPlace: '전국 상권',
  };
}

export type NationwideDesignerDefinition = {
  slot: number;
  storeId: string;
  designer: BetaTestAccount;
  historyYears: 1 | 2 | 3 | 4;
  profileKey: string;
  loginLabel: string;
  customers: BetaTestAccount[];
  dailyMin: number;
  dailyMax: number;
};

function resolveHistoryYears(slot: number): 1 | 2 | 3 | 4 {
  const pattern: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4, 2, 3, 1, 4, 3, 2];

  return pattern[(slot - 1) % pattern.length] ?? (((slot - 1) % 4) + 1) as 1 | 2 | 3 | 4;
}

function customerCountForHistory(slot: number, historyYears: 1 | 2 | 3 | 4) {
  const hash = hashSlot(slot, 11);
  const base = { 1: 30, 2: 38, 3: 48, 4: 58 }[historyYears];
  const span = { 1: 16, 2: 18, 3: 20, 4: 24 }[historyYears];

  return base + (hash % span);
}

function buildCustomers(slot: number, count: number): BetaTestAccount[] {
  return Array.from({ length: count }, (_, index) => {
    const name = CUSTOMER_NAME_POOL[(slot + index) % CUSTOMER_NAME_POOL.length] ?? `고객${index + 1}`;

    return {
      id: `test-nw-${pad4(slot)}-customer-${String(index + 1).padStart(3, '0')}`,
      email: `test-nw-${pad4(slot)}-customer-${index + 1}@hair.app`,
      name,
      password: NATIONWIDE_TEST_PASSWORD,
      role: 'customer' as const,
    };
  });
}

function buildDesignerDefinition(slot: number, storeId: string): NationwideDesignerDefinition {
  const historyYears = resolveHistoryYears(slot);
  const customerCount = customerCountForHistory(slot, historyYears);
  const designerName = DESIGNER_NAME_POOL[(slot - 1) % DESIGNER_NAME_POOL.length] ?? `디자이너 ${slot}`;
  const profileKey = `nw-${pad4(slot)}`;
  const yearLabel = `${historyYears}년차`;

  const designer: BetaTestAccount = {
    id: `test-designer-nw-${pad4(slot)}`,
    email: `test-designer-nw-${pad4(slot)}@hair.app`,
    name: `${designerName} (${yearLabel})`,
    password: NATIONWIDE_TEST_PASSWORD,
    role: 'designer',
  };

  return {
    slot,
    storeId,
    designer,
    historyYears,
    profileKey,
    loginLabel: `전국 · ${designerName} · ${yearLabel}`,
    customers: buildCustomers(slot, customerCount),
    dailyMin: 3,
    dailyMax: 7,
  };
}

function buildStoreDefinitions(): OrgStore[] {
  const stores: OrgStore[] = FLAGSHIP_STORES.map((store) => ({
    ...store,
    designerIds: [...(LEGACY_DESIGNER_IDS_BY_STORE[store.id] ?? [])],
  }));

  for (let index = FLAGSHIP_STORES.length + 1; index <= NATIONWIDE_STORE_COUNT; index += 1) {
    const meta = resolveRegionForStoreIndex(index);
    stores.push({
      id: `virtual-store-nw-${pad4(index)}`,
      name: meta.name,
      region: meta.region,
      hotPlace: meta.hotPlace,
      designerIds: [],
    });
  }

  return stores;
}

function assignNationwideDesigners(stores: OrgStore[]): NationwideDesignerDefinition[] {
  const designers: NationwideDesignerDefinition[] = [];
  let slot = 0;

  for (let storeIndex = 0; storeIndex < stores.length && slot < NATIONWIDE_DESIGNER_COUNT; storeIndex += 1) {
    const nwPerStore = storeIndex < 400 ? 2 : 1;

    for (let count = 0; count < nwPerStore && slot < NATIONWIDE_DESIGNER_COUNT; count += 1) {
      slot += 1;
      const definition = buildDesignerDefinition(slot, stores[storeIndex].id);
      designers.push(definition);
      stores[storeIndex].designerIds.push(definition.designer.id);
    }
  }

  return designers;
}

const builtStores = buildStoreDefinitions();
const builtDesigners = assignNationwideDesigners(builtStores);

export const NATIONWIDE_STORE_DEFINITIONS: OrgStore[] = builtStores;
export const NATIONWIDE_DESIGNER_DEFINITIONS: NationwideDesignerDefinition[] = builtDesigners;

export const NATIONWIDE_DESIGNER_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] =
  NATIONWIDE_DESIGNER_DEFINITIONS.map((item) => ({
    key: item.profileKey,
    designer: item.designer,
    customers: item.customers,
    historyYears: item.historyYears,
    dailyMin: item.dailyMin,
    dailyMax: item.dailyMax,
    treatmentIdPrefix: `accum-${item.profileKey}-treatment-`,
    paymentIdPrefix: `accum-${item.profileKey}-payment-`,
    visitCycleMode: true,
  }));

export const NATIONWIDE_DESIGNERS_PUBLIC = NATIONWIDE_DESIGNER_DEFINITIONS.map((item) => ({
  id: item.designer.id,
  email: item.designer.email,
  password: NATIONWIDE_TEST_PASSWORD,
  name: item.designer.name,
  profileKey: item.profileKey,
  loginLabel: item.loginLabel,
  storeId: item.storeId,
  historyYears: item.historyYears,
}));

const designerConfigById = new Map(
  NATIONWIDE_DESIGNER_DEFINITIONS.map((item) => [item.designer.id, item]),
);

const storeById = new Map(NATIONWIDE_STORE_DEFINITIONS.map((store) => [store.id, store]));

export function isNationwideDesignerId(designerId: string) {
  return designerId.startsWith('test-designer-nw-');
}

export function isNationwideStoreId(storeId: string) {
  return storeId.startsWith('virtual-store-nw-');
}

export function getNationwideDesignerDefinition(designerId: string) {
  return designerConfigById.get(designerId);
}

export function getNationwideDesignerConfig(designerId: string): AccumulatedSeedProfileConfig | undefined {
  const definition = designerConfigById.get(designerId);

  if (!definition) {
    return undefined;
  }

  return NATIONWIDE_DESIGNER_PROFILE_CONFIGS.find((config) => config.key === definition.profileKey);
}

export function getNationwideStoreById(storeId: string) {
  return storeById.get(storeId);
}

export function resolveNationwideStoreId(storeId: string) {
  return LEGACY_STORE_ID_TO_NATIONWIDE[storeId] ?? storeId;
}
