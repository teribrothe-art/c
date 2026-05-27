import { DEMO_LOGIN_HINT } from './auth';
import { BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';

export type OrgDesignerRosterEntry = {
  id: string;
  name: string;
  email: string;
  subtitle?: string;
};

const DEMO_DESIGNER: OrgDesignerRosterEntry = {
  id: 'demo-designer-local',
  name: '김미용 디자이너',
  email: DEMO_LOGIN_HINT.designerEmail,
  subtitle: '데모 매장 대표',
};

const STORE_BETA_DESIGNERS = BETA_DESIGNERS.slice(0, 3).map((designer) => ({
  id: designer.id,
  name: designer.name,
  email: designer.email,
  subtitle: '소속 디자이너',
}));

const ACCUMULATED_ROSTER: OrgDesignerRosterEntry[] = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map(
  (designer) => ({
    id: designer.id,
    name: designer.loginLabel,
    email: designer.email,
    subtitle: '누적 테스트',
  }),
);

/** 매장 소속 디자이너 (데모) */
export function getStoreDesignerRoster(): OrgDesignerRosterEntry[] {
  return [DEMO_DESIGNER, ...STORE_BETA_DESIGNERS];
}

/** 본사에서 조회 가능한 전체 디자이너 (데모) */
export function getAdminDesignerRoster(): OrgDesignerRosterEntry[] {
  const beta = BETA_DESIGNERS.map((designer) => ({
    id: designer.id,
    name: designer.name,
    email: designer.email,
    subtitle: '베타 디자이너',
  }));

  return [DEMO_DESIGNER, ...beta, ...ACCUMULATED_ROSTER];
}

export function getOrgDesignerRoster(scope: 'store' | 'admin'): OrgDesignerRosterEntry[] {
  return scope === 'store' ? getStoreDesignerRoster() : getAdminDesignerRoster();
}

export function findOrgDesigner(
  scope: 'store' | 'admin',
  designerId: string,
): OrgDesignerRosterEntry | undefined {
  return getOrgDesignerRoster(scope).find((entry) => entry.id === designerId);
}

export function isDesignerInOrgScope(scope: 'store' | 'admin', designerId: string) {
  return Boolean(findOrgDesigner(scope, designerId));
}
