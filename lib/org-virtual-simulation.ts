import type { OrgScope } from './org-access';
import type { OrgDashboardSummary, OrgDesignerMetrics } from './org-aggregates';
import { calculateRevenueSplit, DEFAULT_REVENUE_SPLIT_CONFIG } from './revenue-split-config';
import { getOrgDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';
import {
  ORG_STORE_DEFINITIONS,
  STORE_SCOPE_STORE_ID,
  type OrgStore,
} from './org-store-affiliation';

export type VirtualSimulationScenario = 'weekday' | 'weekend_peak' | 'month_end';

export type VirtualStore = OrgStore;

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
    label: '주말 운영',
    description: '주말 예약·시술이 몰리는 운영 시나리오',
  },
  {
    key: 'month_end',
    label: '월말 정산',
    description: '정산·대기 건이 늘어나는 월말 시나리오',
  },
];

/** 가상 매장 네트워크 (본사 시뮬레이션) — org-store-affiliation 과 동기화 */
export const VIRTUAL_STORES: VirtualStore[] = ORG_STORE_DEFINITIONS;

export { STORE_SCOPE_STORE_ID };

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
  const monthGrossSales = Math.round((3_200_000 + (hash % 9) * 480_000) * mult.revenue);
  const split = calculateRevenueSplit(monthGrossSales, DEFAULT_REVENUE_SPLIT_CONFIG);
  const monthTreatmentCount = Math.round((12 + (hash % 18)) * mult.treatments);
  const pendingPayoutAmount = Math.round((180_000 + (hash % 7) * 95_000) * mult.pending);

  return {
    treatmentCount,
    customerCount,
    monthGrossSales,
    monthHqRevenue: split.hqFeeAmount,
    monthDesignerPayout: split.designerPayout,
    monthStoreShare: split.storePayout,
    monthRevenue: split.designerPayout,
    monthTreatmentCount,
    pendingPayoutAmount,
  };
}

function mergeDesignerMetrics(
  real: OrgDesignerMetrics,
  scenario: VirtualSimulationScenario,
): OrgDesignerMetrics {
  const virtual = virtualBaselineForDesigner(real, scenario);

  const monthGrossSales = Math.max(real.monthGrossSales, virtual.monthGrossSales);
  const split = calculateRevenueSplit(monthGrossSales, DEFAULT_REVENUE_SPLIT_CONFIG);

  return {
    ...real,
    treatmentCount: Math.max(real.treatmentCount, virtual.treatmentCount),
    customerCount: Math.max(real.customerCount, virtual.customerCount),
    monthGrossSales,
    monthHqRevenue: split.hqFeeAmount,
    monthDesignerPayout: split.designerPayout,
    monthStoreShare: split.storePayout,
    monthRevenue: split.designerPayout,
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

  const monthGrossSales = designers.reduce((sum, item) => sum + item.monthGrossSales, 0);
  const monthHqRevenue = designers.reduce((sum, item) => sum + item.monthHqRevenue, 0);
  const monthDesignerPayout = designers.reduce((sum, item) => sum + item.monthDesignerPayout, 0);
  const monthStoreShare = designers.reduce((sum, item) => sum + item.monthStoreShare, 0);
  const hqYieldRate =
    monthGrossSales > 0 ? Math.round((monthHqRevenue / monthGrossSales) * 1000) / 10 : 0;

  return {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthGrossSales,
    monthCardFee: designers.reduce(
      (sum, item) => sum + Math.round((item.monthGrossSales * DEFAULT_REVENUE_SPLIT_CONFIG.cardFeePercent) / 100),
      0,
    ),
    monthHqRevenue,
    monthDesignerPayout,
    monthStoreShare,
    hqYieldRate,
    configuredHqRate: summary.configuredHqRate,
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    monthRevenue: monthDesignerPayout,
    designers,
  };
}

export type VirtualStoreSummary = VirtualStore & {
  designerCount: number;
  monthGrossSales: number;
  monthHqRevenue: number;
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
      monthGrossSales: designers.reduce((sum, item) => sum + item.monthGrossSales, 0),
      monthHqRevenue: designers.reduce((sum, item) => sum + item.monthHqRevenue, 0),
      monthRevenue: designers.reduce((sum, item) => sum + item.monthDesignerPayout, 0),
      monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
      customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
      pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    };
  });
}

export function getVirtualStoreForScope(scope: OrgScope, storeOrgId?: string) {
  if (scope === 'store') {
    const resolvedId = storeOrgId ?? STORE_SCOPE_STORE_ID;

    return VIRTUAL_STORES.find((store) => store.id === resolvedId) ?? VIRTUAL_STORES[0];
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
  storeOrgId?: string,
): OrgDashboardSummary {
  if (scope !== 'store') {
    return summary;
  }

  const store = getVirtualStoreForScope('store', storeOrgId);
  const allowed = new Set(store?.designerIds ?? []);
  const designers = summary.designers.filter((designer) => allowed.has(designer.id));

  const monthGrossSales = designers.reduce((sum, item) => sum + item.monthGrossSales, 0);
  const monthHqRevenue = designers.reduce((sum, item) => sum + item.monthHqRevenue, 0);
  const hqYieldRate =
    monthGrossSales > 0 ? Math.round((monthHqRevenue / monthGrossSales) * 1000) / 10 : 0;

  return {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthGrossSales,
    monthCardFee: designers.reduce(
      (sum, item) => sum + Math.round((item.monthGrossSales * DEFAULT_REVENUE_SPLIT_CONFIG.cardFeePercent) / 100),
      0,
    ),
    monthHqRevenue,
    monthDesignerPayout: designers.reduce((sum, item) => sum + item.monthDesignerPayout, 0),
    monthStoreShare: designers.reduce((sum, item) => sum + item.monthStoreShare, 0),
    hqYieldRate,
    configuredHqRate: summary.configuredHqRate,
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    monthRevenue: designers.reduce((sum, item) => sum + item.monthDesignerPayout, 0),
    designers,
  };
}
