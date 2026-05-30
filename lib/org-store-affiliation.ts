import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import {
  isNationwideStoreId,
  LEGACY_STORE_ID_TO_NATIONWIDE,
  NATIONWIDE_DESIGNER_DEFINITIONS,
  NATIONWIDE_STORE_DEFINITIONS,
  resolveNationwideStoreId,
} from './nationwide-org-catalog';
import { resolveStoreOrgIdForUser } from './store-test-accounts';

export type OrgStore = {
  id: string;
  /** 매장명 (플랜비 브랜드) */
  name: string;
  /** 행정·상권 지역 */
  region: string;
  /** 지역·상권 한 줄 설명 */
  hotPlace: string;
  designerIds: string[];
};

/** 전국 플랜비 매장 (600곳) */
export const ORG_STORE_DEFINITIONS: OrgStore[] = NATIONWIDE_STORE_DEFINITIONS;

/** 매장 로그인(`store@hair.app`)이 관리하는 플랜비 매장 */
export const STORE_ACCOUNT_LINKED_STORE_ID = 'virtual-store-nw-0001';

/** @deprecated 강남 플랜비(구 핫플레이스) ID 변경 전 호환 */
export const LEGACY_STORE_IDS = {
  gangnam: 'virtual-store-gangnam',
  hongdae: 'virtual-store-hongdae',
  accumLab: 'virtual-store-accum-lab',
  hotGangnam: 'virtual-store-hot-gangnam',
  hotHongdae: 'virtual-store-hot-hongdae',
  hotSeongsu: 'virtual-store-hot-seongsu',
  hotBusan: 'virtual-store-hot-busan',
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
  ...NATIONWIDE_DESIGNER_DEFINITIONS.map((designer) => designer.designer.id),
] as const;

const LEGACY_MAX_DESIGNERS_PER_STORE = 8;

function isLegacyStore(store: OrgStore) {
  return !isNationwideStoreId(store.id) || ['virtual-store-nw-0001', 'virtual-store-nw-0002', 'virtual-store-nw-0003', 'virtual-store-nw-0004'].includes(store.id);
}

function assertCompleteAffiliations() {
  const missing = ALL_ORG_DESIGNER_IDS.filter((designerId) => !designerToStoreMap.has(designerId));

  if (missing.length > 0) {
    throw new Error(`매장 소속이 없는 디자이너: ${missing.join(', ')}`);
  }

  for (const store of ORG_STORE_DEFINITIONS) {
    const count = store.designerIds.length;

    if (isLegacyStore(store) && (count < 2 || count > LEGACY_MAX_DESIGNERS_PER_STORE)) {
      throw new Error(
        `${store.name} 디자이너 수는 2~${LEGACY_MAX_DESIGNERS_PER_STORE}명이어야 합니다 (현재 ${count}명)`,
      );
    }

    if (isNationwideStoreId(store.id) && (count < 1 || count > 4)) {
      throw new Error(`${store.name} 디자이너 수는 1~4명이어야 합니다 (현재 ${count}명)`);
    }
  }
}

assertCompleteAffiliations();

export function getOrgStoreById(storeId: string): OrgStore | undefined {
  const resolved = resolveOrgStoreId(storeId);

  return ORG_STORE_DEFINITIONS.find((store) => store.id === resolved);
}

/** 레거시 매장 ID → 현재 플랜비 매장 */
export function resolveOrgStoreId(storeId: string): string {
  if (ORG_STORE_DEFINITIONS.some((store) => store.id === storeId)) {
    return storeId;
  }

  const nationwideAlias = LEGACY_STORE_ID_TO_NATIONWIDE[storeId];

  if (nationwideAlias) {
    return nationwideAlias;
  }

  if (storeId === LEGACY_STORE_IDS.gangnam || storeId === LEGACY_STORE_IDS.hotGangnam) {
    return 'virtual-store-nw-0001';
  }

  if (storeId === LEGACY_STORE_IDS.hongdae || storeId === LEGACY_STORE_IDS.hotHongdae) {
    return 'virtual-store-nw-0002';
  }

  if (storeId === LEGACY_STORE_IDS.accumLab || storeId === LEGACY_STORE_IDS.hotSeongsu) {
    return 'virtual-store-nw-0003';
  }

  if (storeId === LEGACY_STORE_IDS.hotBusan) {
    return 'virtual-store-nw-0004';
  }

  return resolveNationwideStoreId(storeId);
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
  subtitle: '강남 플랜비',
} as const;
