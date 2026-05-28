import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import { STORE_TEST_ACCOUNT } from './store-test-accounts';

export type OrgStore = {
  id: string;
  name: string;
  region: string;
  designerIds: string[];
};

/** 데모 매장 네트워크 — 디자이너 소속의 단일 정의 */
export const ORG_STORE_DEFINITIONS: OrgStore[] = [
  {
    id: 'virtual-store-gangnam',
    name: '강남 본점',
    region: '서울 강남',
    designerIds: ['demo-designer-local', 'beta-designer-01', 'beta-designer-02', 'beta-designer-05'],
  },
  {
    id: 'virtual-store-hongdae',
    name: '홍대점',
    region: '서울 마포',
    designerIds: ['beta-designer-03', 'beta-designer-04'],
  },
  {
    id: 'virtual-store-accum-lab',
    name: '누적 테스트 Lab',
    region: '데모 전용',
    designerIds: ['test-designer-1y', 'test-designer-3y', 'test-designer-accum-5y'],
  },
];

/** 매장 로그인(`store@hair.app`)이 관리하는 매장 */
export const STORE_ACCOUNT_LINKED_STORE_ID = 'virtual-store-gangnam';

const designerToStoreMap = new Map<string, OrgStore>();

for (const store of ORG_STORE_DEFINITIONS) {
  for (const designerId of store.designerIds) {
    designerToStoreMap.set(designerId, store);
  }
}

export const ALL_ORG_DESIGNER_IDS = [
  'demo-designer-local',
  ...BETA_DESIGNERS.map((designer) => designer.id),
  ...ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) => designer.id),
] as const;

function assertCompleteAffiliations() {
  const missing = ALL_ORG_DESIGNER_IDS.filter((designerId) => !designerToStoreMap.has(designerId));

  if (missing.length > 0) {
    throw new Error(`매장 소속이 없는 디자이너: ${missing.join(', ')}`);
  }
}

assertCompleteAffiliations();

export function getOrgStoreById(storeId: string): OrgStore | undefined {
  return ORG_STORE_DEFINITIONS.find((store) => store.id === storeId);
}

export function getDesignerStoreAffiliation(designerId: string) {
  const store = designerToStoreMap.get(designerId);

  if (!store) {
    return null;
  }

  return { store };
}

export function getDesignerIdsForStore(storeId: string) {
  return getOrgStoreById(storeId)?.designerIds ?? [];
}

export function getOrgStoreForAccountUser(user: { id: string; role?: string | null }) {
  if (user.role === 'store' && user.id === STORE_TEST_ACCOUNT.id) {
    return getOrgStoreById(STORE_ACCOUNT_LINKED_STORE_ID) ?? null;
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

  return `${affiliation.store.name} · ${affiliation.store.region}`;
}

export function formatStoreAffiliationLine(store: OrgStore) {
  return `${store.name} · ${store.region}`;
}

/** @deprecated org-virtual-simulation 호환 */
export const STORE_SCOPE_STORE_ID = STORE_ACCOUNT_LINKED_STORE_ID;

export const DEMO_DESIGNER_ROSTER_SEED = {
  id: 'demo-designer-local',
  name: '김미용 디자이너',
  email: DEMO_LOGIN_HINT.designerEmail,
  subtitle: '데모 매장 대표',
} as const;
