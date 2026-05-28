import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import { EXPANDED_DESIGNER_IDS_BY_STORE } from './demo-expanded-store-designers';
import { resolveStoreOrgIdForUser } from './store-test-accounts';

export type OrgStore = {
  id: string;
  /** 매장명 (핫플레이스 브랜드) */
  name: string;
  /** 행정·상권 지역 */
  region: string;
  /** 지역 핫플레이스 한 줄 설명 */
  hotPlace: string;
  designerIds: string[];
};

const ORG_STORE_DEFINITIONS_BASE: OrgStore[] = [
  {
    id: 'virtual-store-hot-gangnam',
    name: '강남 핫플레이스',
    region: '서울 강남',
    hotPlace: '역삼·청담·압구정 상권',
    designerIds: ['demo-designer-local', 'beta-designer-01', 'beta-designer-02'],
  },
  {
    id: 'virtual-store-hot-hongdae',
    name: '홍대·연남 핫플레이스',
    region: '서울 마포',
    hotPlace: '홍익대·연남동·망원 상권',
    designerIds: ['beta-designer-03', 'beta-designer-04'],
  },
  {
    id: 'virtual-store-hot-seongsu',
    name: '성수 핫플레이스',
    region: '서울 성동',
    hotPlace: '성수·뚝섬 카페·살롱 거리',
    designerIds: ['beta-designer-05', 'test-designer-1y'],
  },
  {
    id: 'virtual-store-hot-busan',
    name: '해운대·광안리 핫플레이스',
    region: '부산 해운대',
    hotPlace: '해운대·광안리·센텀',
    designerIds: ['test-designer-3y', 'test-designer-accum-3y', 'test-designer-accum-5y'],
  },
];

/**
 * 지역별 핫플레이스 매장 — 디자이너 2~8명 (증원 15명 포함)
 */
export const ORG_STORE_DEFINITIONS: OrgStore[] = ORG_STORE_DEFINITIONS_BASE.map((store) => ({
  ...store,
  designerIds: [
    ...store.designerIds,
    ...(EXPANDED_DESIGNER_IDS_BY_STORE[store.id] ?? []),
  ],
}));

/** 매장 로그인(`store@hair.app`)이 관리하는 핫플레이스 */
export const STORE_ACCOUNT_LINKED_STORE_ID = 'virtual-store-hot-gangnam';

/** @deprecated 강남 핫플레이스 ID 변경 전 호환 */
export const LEGACY_STORE_IDS = {
  gangnam: 'virtual-store-gangnam',
  hongdae: 'virtual-store-hongdae',
  accumLab: 'virtual-store-accum-lab',
} as const;

const designerToStoreMap = new Map<string, OrgStore>();

for (const store of ORG_STORE_DEFINITIONS) {
  for (const designerId of store.designerIds) {
    if (designerToStoreMap.has(designerId)) {
      throw new Error(`디자이너 ${designerId} 가 중복 매장에 배정됨`);
    }

    designerToStoreMap.set(designerId, store);
  }
}

export const ALL_ORG_DESIGNER_IDS = [
  'demo-designer-local',
  ...BETA_DESIGNERS.map((designer) => designer.id),
  ...ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) => designer.id),
] as const;

const MAX_DESIGNERS_PER_STORE = 8;

function assertCompleteAffiliations() {
  const missing = ALL_ORG_DESIGNER_IDS.filter((designerId) => !designerToStoreMap.has(designerId));

  if (missing.length > 0) {
    throw new Error(`매장 소속이 없는 디자이너: ${missing.join(', ')}`);
  }

  for (const store of ORG_STORE_DEFINITIONS) {
    const count = store.designerIds.length;

    if (count < 2 || count > MAX_DESIGNERS_PER_STORE) {
      throw new Error(
        `${store.name} 디자이너 수는 2~${MAX_DESIGNERS_PER_STORE}명이어야 합니다 (현재 ${count}명)`,
      );
    }
  }
}

assertCompleteAffiliations();

export function getOrgStoreById(storeId: string): OrgStore | undefined {
  return ORG_STORE_DEFINITIONS.find((store) => store.id === storeId);
}

/** 레거시 매장 ID → 현재 핫플레이스 매장 */
export function resolveOrgStoreId(storeId: string): string {
  if (getOrgStoreById(storeId)) {
    return storeId;
  }

  if (storeId === LEGACY_STORE_IDS.gangnam) {
    return 'virtual-store-hot-gangnam';
  }

  if (storeId === LEGACY_STORE_IDS.hongdae) {
    return 'virtual-store-hot-hongdae';
  }

  if (storeId === LEGACY_STORE_IDS.accumLab) {
    return 'virtual-store-hot-busan';
  }

  return storeId;
}

export function getDesignerStoreAffiliation(designerId: string) {
  const store = designerToStoreMap.get(designerId);

  if (!store) {
    return null;
  }

  return { store };
}

export function getDesignerIdsForStore(storeId: string) {
  const resolved = resolveOrgStoreId(storeId);

  return getOrgStoreById(resolved)?.designerIds ?? [];
}

export function getOrgStoreForAccountUser(user: {
  id: string;
  role?: string | null;
  email?: string;
}) {
  const linkedStoreId = resolveStoreOrgIdForUser(user);

  if (linkedStoreId) {
    return getOrgStoreById(linkedStoreId) ?? null;
  }

  if (user.role === 'designer') {
    return getDesignerStoreAffiliation(user.id)?.store ?? null;
  }

  return null;
}

export function formatDesignerStoreLabel(designerId: string) {
  const affiliation = getDesignerStoreAffiliation(designerId);

  if (!affiliation) {
    return '매장 미연결';
  }

  return `${affiliation.store.name} · ${affiliation.store.hotPlace}`;
}

export function formatStoreAffiliationLine(store: OrgStore) {
  return `${store.name} · ${store.hotPlace}`;
}

export function formatStoreRegionLine(store: OrgStore) {
  return `${store.region} · ${store.hotPlace}`;
}

/** @deprecated org-virtual-simulation 호환 */
export const STORE_SCOPE_STORE_ID = STORE_ACCOUNT_LINKED_STORE_ID;

export const DEMO_DESIGNER_ROSTER_SEED = {
  id: 'demo-designer-local',
  name: '김미용 디자이너',
  email: DEMO_LOGIN_HINT.designerEmail,
  subtitle: '강남 핫플레이스',
} as const;
