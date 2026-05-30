import type { OrgScope } from './org-access';
import type { OrgDashboardSummary, OrgDesignerMetrics } from './org-aggregates';
import {
  calculateRevenueSplit,
  DEFAULT_REVENUE_SPLIT_CONFIG,
  type RevenueSplitConfig,
} from './revenue-split-config';
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
    description: '실제 시술·금액 기준 (배율 1.0)',
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

function scenarioMultiplier(scenario: VirtualSimulationScenario) {
  if (scenario === 'weekend_peak') {
    return { revenue: 1.35, treatments: 1.28, pending: 0.85, customers: 1.15 };
  }

  if (scenario === 'month_end') {
    return { revenue: 1.08, treatments: 1.05, pending: 1.65, customers: 1.02 };
  }

  return { revenue: 1, treatments: 1, pending: 1, customers: 1 };
}

function splitConfigFromSummary(summary: OrgDashboardSummary): RevenueSplitConfig {
  return {
    ...DEFAULT_REVENUE_SPLIT_CONFIG,
    hqFeePercent: summary.configuredHqRate,
  };
}

function scenarioSuffix(scenario: VirtualSimulationScenario) {
  if (scenario === 'weekend_peak') {
    return '주말 시나리오';
  }

  if (scenario === 'month_end') {
    return '월말 시나리오';
  }

  return '실제 데이터';
}

function scaleCount(value: number, multiplier: number) {
  return Math.max(0, Math.round(value * multiplier));
}

/** 실제 디자이너 지표에 시나리오 배율만 적용 (가짜 베이스라인 없음) */
function scaleDesignerMetrics(
  real: OrgDesignerMetrics,
  scenario: VirtualSimulationScenario,
  config: RevenueSplitConfig,
): OrgDesignerMetrics {
  const mult = scenarioMultiplier(scenario);
  const monthGrossSales = Math.round(real.monthGrossSales * mult.revenue);
  const split = calculateRevenueSplit(monthGrossSales, config);
  const suffix = scenarioSuffix(scenario);

  return {
    ...real,
    treatmentCount: scaleCount(real.treatmentCount, mult.treatments),
    customerCount: scaleCount(real.customerCount, mult.customers),
    monthGrossSales,
    monthHqRevenue: split.hqFeeAmount,
    monthDesignerPayout: split.designerPayout,
    monthStoreShare: split.storePayout,
    monthRevenue: split.designerPayout,
    monthTreatmentCount: scaleCount(real.monthTreatmentCount, mult.treatments),
    pendingPayoutAmount: Math.round(real.pendingPayoutAmount * mult.pending),
    subtitle: real.subtitle ? `${real.subtitle} · ${suffix}` : suffix,
  };
}

function aggregateSummaryFromDesigners(
  designers: OrgDesignerMetrics[],
  configuredHqRate: number,
): OrgDashboardSummary {
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
      (sum, item) =>
        sum + Math.round((item.monthGrossSales * DEFAULT_REVENUE_SPLIT_CONFIG.cardFeePercent) / 100),
      0,
    ),
    monthHqRevenue,
    monthDesignerPayout,
    monthStoreShare,
    hqYieldRate,
    configuredHqRate,
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    monthRevenue: monthDesignerPayout,
    designers,
  };
}

export function applyVirtualSimulationToSummary(
  summary: OrgDashboardSummary,
  scenario: VirtualSimulationScenario = 'weekday',
): OrgDashboardSummary {
  const config = splitConfigFromSummary(summary);
  const designers = summary.designers.map((designer) => scaleDesignerMetrics(designer, scenario, config));

  return aggregateSummaryFromDesigners(designers, summary.configuredHqRate);
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

export function getSimulationTimeline(
  scenario: VirtualSimulationScenario,
  monthTreatmentCount = 0,
) {
  const mult = scenarioMultiplier(scenario);
  const dailyBase = Math.max(1, Math.round((monthTreatmentCount / 22) * mult.treatments));

  return [
    { hour: '10:00', label: '오전 예약 체크인', value: Math.max(1, Math.round(dailyBase * 0.22)) },
    { hour: '13:00', label: '점심 피크 시술', value: Math.max(1, Math.round(dailyBase * 0.32)) },
    { hour: '16:00', label: '컬러·펌 집중', value: Math.max(1, Math.round(dailyBase * 0.28)) },
    { hour: '19:00', label: '저녁 마감 정산', value: Math.max(1, Math.round(dailyBase * 0.18)) },
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

  return aggregateSummaryFromDesigners(designers, summary.configuredHqRate);
}
