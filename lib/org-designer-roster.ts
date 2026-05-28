import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import {
  DEMO_DESIGNER_ROSTER_SEED,
  getDesignerStoreAffiliation,
  STORE_SCOPE_STORE_ID,
} from './org-store-affiliation';

export type OrgDesignerRosterEntry = {
  id: string;
  name: string;
  email: string;
  subtitle?: string;
  storeId: string;
  storeName: string;
  storeRegion: string;
};

function enrichWithStore(entry: {
  id: string;
  name: string;
  email: string;
  subtitle?: string;
}): OrgDesignerRosterEntry {
  const affiliation = getDesignerStoreAffiliation(entry.id);

  if (!affiliation) {
    throw new Error(`매장 소속이 없습니다: ${entry.id}`);
  }

  return {
    ...entry,
    storeId: affiliation.store.id,
    storeName: affiliation.store.name,
    storeRegion: affiliation.store.hotPlace,
  };
}

const DEMO_DESIGNER = enrichWithStore(DEMO_DESIGNER_ROSTER_SEED);

const BETA_ROSTER = BETA_DESIGNERS.map((designer) =>
  enrichWithStore({
    id: designer.id,
    name: designer.name,
    email: designer.email,
    subtitle: '베타 디자이너',
  }),
);

const ACCUMULATED_ROSTER = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) =>
  enrichWithStore({
    id: designer.id,
    name: designer.loginLabel,
    email: designer.email,
    subtitle: '누적 테스트',
  }),
);

const FULL_ROSTER: OrgDesignerRosterEntry[] = [DEMO_DESIGNER, ...BETA_ROSTER, ...ACCUMULATED_ROSTER];

/** 본사에서 조회 가능한 전체 디자이너 (모두 매장 연결) */
export function getAdminDesignerRoster(): OrgDesignerRosterEntry[] {
  return FULL_ROSTER;
}

/** 매장 소속 디자이너 */
export function getStoreDesignerRoster(storeId = STORE_SCOPE_STORE_ID): OrgDesignerRosterEntry[] {
  return FULL_ROSTER.filter((entry) => entry.storeId === storeId);
}

export function getOrgDesignerRoster(
  scope: 'store' | 'admin',
  storeOrgId?: string,
): OrgDesignerRosterEntry[] {
  return scope === 'store' ? getStoreDesignerRoster(storeOrgId) : getAdminDesignerRoster();
}

export function findOrgDesigner(
  scope: 'store' | 'admin',
  designerId: string,
  storeOrgId?: string,
): OrgDesignerRosterEntry | undefined {
  return getOrgDesignerRoster(scope, storeOrgId).find((entry) => entry.id === designerId);
}

export function isDesignerInOrgScope(
  scope: 'store' | 'admin',
  designerId: string,
  storeOrgId?: string,
) {
  return Boolean(findOrgDesigner(scope, designerId, storeOrgId));
}
