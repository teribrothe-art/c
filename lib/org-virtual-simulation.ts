import type { OrgScope } from './org-access';
import type { OrgDashboardSummary, OrgDesignerMetrics } from './org-aggregates';
import { getOrgDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';

export type VirtualSimulationScenario = 'weekday' | 'weekend_peak' | 'month_end';

export type VirtualStore = {
  id: string;
  name: string;
  region: string;
  designerIds: string[];
};

export const VIRTUAL_SIMULATION_SCENARIOS: {
  key: VirtualSimulationScenario;
  label: string;
  description: string;
}[] = [
  {
    key: 'weekday',
    label: '평일 운영',
    description: '일반적인 평일 매장·디자이너 흐름',
  },
  {
    key: 'weekend_peak',
    label: '주말 피크',
    description: '주말 예약·시술이 몰리는 피크 시나리오',
  },
  {
    key: 'month_end',
    label: '월말 정산',
    description: '정산·대기 건이 늘어나는 월말 시나리오',
  },
];

/** 가상 매장 네트워크 (본사 시뮬레이션) */
export const VIRTUAL_STORES: VirtualStore[] = [
  {
    id: 'virtual-store-gangnam',
    name: '강남 본점',
    region: '서울 강남',
    designerIds: ['demo-designer-local', 'beta-designer-01', 'beta-designer-02'],
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
    designerIds: ['test-designer-1y', 'test-designer-3y', 'test-designer-accum-3y'],
  },
];

const STORE_SCOPE_STORE_ID = 'virtual-store-gangnam';

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function scenarioMultiplier(scenario: VirtualSimulationScenario) {
  if (scenario === 'weekend_peak') {
    return { revenue: 1.35, treatments: 1.28, pending: 0.85, customers: 1.15 };
  }

  if (scenario === 'month_end') {
    return { revenue: 1.08, treatments: 1.05, pending: 1.65, customers: 1.02 };
  }

  return { revenue: 1, treatments: 1, pending: 1, customers: 1 };
}

function virtualBaselineForDesigner(
  entry: OrgDesignerRosterEntry,
  scenario: VirtualSimulationScenario,
): Omit<OrgDesignerMetrics, keyof OrgDesignerRosterEntry> {
  const hash = hashString(`${entry.id}-${scenario}`);
  const mult = scenarioMultiplier(scenario);

  const treatmentCount = Math.round((48 + (hash % 72)) * mult.treatments);
  const customerCount = Math.round((18 + (hash % 22)) * mult.customers);
  const monthRevenue = Math.round((2_800_000 + (hash % 9) * 420_000) * mult.revenue);
  const monthTreatmentCount = Math.round((12 + (hash % 18)) * mult.treatments);
  const pendingPayoutAmount = Math.round((180_000 + (hash % 7) * 95_000) * mult.pending);

  return {
    treatmentCount,
    customerCount,
    monthRevenue,
    monthTreatmentCount,
    pendingPayoutAmount,
  };
}

function mergeDesignerMetrics(
  real: OrgDesignerMetrics,
  scenario: VirtualSimulationScenario,
): OrgDesignerMetrics {
  const virtual = virtualBaselineForDesigner(real, scenario);

  return {
    ...real,
    treatmentCount: Math.max(real.treatmentCount, virtual.treatmentCount),
    customerCount: Math.max(real.customerCount, virtual.customerCount),
    monthRevenue: Math.max(real.monthRevenue, virtual.monthRevenue),
    monthTreatmentCount: Math.max(real.monthTreatmentCount, virtual.monthTreatmentCount),
    pendingPayoutAmount: Math.max(real.pendingPayoutAmount, virtual.pendingPayoutAmount),
    subtitle: real.subtitle ? `${real.subtitle} · 가상 연동` : '가상 시뮬레이션',
  };
}

export function applyVirtualSimulationToSummary(
  summary: OrgDashboardSummary,
  scenario: VirtualSimulationScenario = 'weekday',
): OrgDashboardSummary {
  const designers = summary.designers.map((designer) => mergeDesignerMetrics(designer, scenario));

  return {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthRevenue: designers.reduce((sum, item) => sum + item.monthRevenue, 0),
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    designers,
  };
}

export type VirtualStoreSummary = VirtualStore & {
  designerCount: number;
  monthRevenue: number;
  monthTreatmentCount: number;
  customerCount: number;
  pendingPayoutAmount: number;
};

export function buildVirtualStoreSummaries(summary: OrgDashboardSummary): VirtualStoreSummary[] {
  const designerMap = new Map(summary.designers.map((designer) => [designer.id, designer]));

  return VIRTUAL_STORES.map((store) => {
    const designers = store.designerIds
      .map((id) => designerMap.get(id))
      .filter((item): item is OrgDesignerMetrics => Boolean(item));

    return {
      ...store,
      designerCount: designers.length,
      monthRevenue: designers.reduce((sum, item) => sum + item.monthRevenue, 0),
      monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
      customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
      pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    };
  });
}

export function getVirtualStoreForScope(scope: OrgScope) {
  if (scope === 'store') {
    return VIRTUAL_STORES.find((store) => store.id === STORE_SCOPE_STORE_ID) ?? VIRTUAL_STORES[0];
  }

  return null;
}

export function getSimulationTimeline(scenario: VirtualSimulationScenario) {
  const mult = scenarioMultiplier(scenario);

  return [
    { hour: '10:00', label: '오전 예약 체크인', value: Math.round(4 * mult.treatments) },
    { hour: '13:00', label: '점심 피크 시술', value: Math.round(7 * mult.treatments) },
    { hour: '16:00', label: '컬러·펌 집중', value: Math.round(6 * mult.treatments) },
    { hour: '19:00', label: '저녁 마감 정산', value: Math.round(5 * mult.treatments) },
  ];
}

export function filterSummaryForStoreScope(
  summary: OrgDashboardSummary,
  scope: OrgScope,
): OrgDashboardSummary {
  if (scope !== 'store') {
    return summary;
  }

  const store = getVirtualStoreForScope('store');
  const allowed = new Set(store?.designerIds ?? []);
  const designers = summary.designers.filter((designer) => allowed.has(designer.id));

  return {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthRevenue: designers.reduce((sum, item) => sum + item.monthRevenue, 0),
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    designers,
  };
}
