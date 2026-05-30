import { isDemoAuthMode } from './auth';
import { settlementTotalsFromGross, type OrgMonthSettlementTotals } from './org-month-settlement';
import { resolveDesignerMonthSettlement } from './org-designer-month-metrics';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import { calculatePaymentFees, listPaymentsForDesignerId, type PaymentRecord } from './payment-record';
import { listTreatmentsForDesignerId } from './treatments';
import { getOrgDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';
import type { OrgScope } from './org-access';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import {
  applyVirtualSimulationToSummary,
  filterSummaryForStoreScope,
  type VirtualSimulationScenario,
} from './org-virtual-simulation';
import type { Treatment } from './treatments';
import { ORG_STORE_DEFINITIONS } from './org-store-affiliation';
import { isNationwideDesignerId } from './nationwide-org-catalog';
import { computeNationwideDesignerMetrics } from './nationwide-designer-metrics';

export type OrgDesignerMetrics = OrgDesignerRosterEntry & {
  treatmentCount: number;
  customerCount: number;
  /** @deprecated 디자이너 정산액 — monthDesignerPayout 과 동일 */
  monthRevenue: number;
  monthGrossSales: number;
  monthHqRevenue: number;
  monthDesignerPayout: number;
  monthStoreShare: number;
  monthTreatmentCount: number;
  pendingPayoutAmount: number;
};

export type OrgDashboardSummary = OrgMonthSettlementTotals & {
  designerCount: number;
  treatmentCount: number;
  customerCount: number;
  monthTreatmentCount: number;
  pendingPayoutAmount: number;
  /** @deprecated 디자이너 정산 합 — monthDesignerPayout 과 동일 */
  monthRevenue: number;
  designers: OrgDesignerMetrics[];
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function uniqueCustomerCount(treatments: Treatment[]) {
  const ids = new Set<string>();

  for (const treatment of treatments) {
    const key = treatment.customer_id ?? treatment.customer_name ?? treatment.id;

    ids.add(key);
  }

  return ids.size;
}

function pendingPayoutFromPayments(payments: PaymentRecord[], treatments: Treatment[], monthKey: string) {
  const treatmentMap = new Map(treatments.map((treatment) => [treatment.id, treatment]));
  let total = 0;

  for (const payment of payments) {
    if (payment.status !== 'paid' && payment.status !== 'in_escrow') {
      continue;
    }

    const treatment = treatmentMap.get(payment.treatment_id);
    const treatmentMonth = treatment?.treatment_date?.slice(0, 7);

    if (treatmentMonth !== monthKey) {
      continue;
    }

    total += payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
  }

  return total;
}

async function metricsForDesigner(
  entry: OrgDesignerRosterEntry,
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
): Promise<OrgDesignerMetrics> {
  if (isNationwideDesignerId(entry.id)) {
    return computeNationwideDesignerMetrics(entry, config);
  }

  const treatments = await listTreatmentsForDesignerId(entry.id);
  const payments = await listPaymentsForDesignerId(entry.id);
  const monthTreatments = treatments.filter(
    (treatment) => (treatment.treatment_date ?? '').slice(0, 7) === monthKey,
  );
  const settlement = resolveDesignerMonthSettlement(treatments, payments, monthKey, config);

  return {
    ...entry,
    treatmentCount: treatments.length,
    customerCount: uniqueCustomerCount(treatments),
    monthRevenue: settlement.monthDesignerPayout,
    monthGrossSales: settlement.monthGrossSales,
    monthHqRevenue: settlement.monthHqRevenue,
    monthDesignerPayout: settlement.monthDesignerPayout,
    monthStoreShare: settlement.monthStoreShare,
    monthTreatmentCount: monthTreatments.length,
    pendingPayoutAmount: pendingPayoutFromPayments(payments, treatments, monthKey),
  };
}

export async function fetchOrgDashboardSummary(
  scope: OrgScope,
  options?: {
    scenario?: VirtualSimulationScenario;
    withVirtualSimulation?: boolean;
    storeOrgId?: string;
  },
): Promise<OrgDashboardSummary> {
  const monthKey = currentMonthKey();
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const roster = getOrgDesignerRoster(scope, storeOrgId);
  const config = await getActiveRevenueSplitConfig();
  const designers = await Promise.all(
    roster.map((entry) => metricsForDesigner(entry, monthKey, config)),
  );
  const monthGrossSales = designers.reduce((sum, item) => sum + item.monthGrossSales, 0);
  const settlement = settlementTotalsFromGross(monthGrossSales, config);

  let summary: OrgDashboardSummary = {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    monthRevenue: settlement.monthDesignerPayout,
    designers,
    ...settlement,
  };

  const useSimulation = options?.withVirtualSimulation === true;

  if (useSimulation) {
    summary = applyVirtualSimulationToSummary(
      filterSummaryForStoreScope(summary, scope, storeOrgId),
      options?.scenario ?? 'weekday',
    );
  } else if (scope === 'store') {
    summary = filterSummaryForStoreScope(summary, scope, storeOrgId);
  }

  return summary;
}

export type OrgDesignerStoreGroup = {
  storeId: string;
  storeName: string;
  storeRegion: string;
  designers: OrgDesignerMetrics[];
  customerCount: number;
  treatmentCount: number;
  monthTreatmentCount: number;
  monthGrossSales: number;
  monthHqRevenue: number;
  monthRevenue: number;
};

export function groupOrgDesignersByStore(designers: OrgDesignerMetrics[]): OrgDesignerStoreGroup[] {
  const grouped = new Map<string, OrgDesignerStoreGroup>();

  for (const designer of designers) {
    const current = grouped.get(designer.storeId);

    if (current) {
      current.designers.push(designer);
      current.customerCount += designer.customerCount;
      current.treatmentCount += designer.treatmentCount;
      current.monthTreatmentCount += designer.monthTreatmentCount;
      current.monthGrossSales += designer.monthGrossSales;
      current.monthHqRevenue += designer.monthHqRevenue;
      current.monthRevenue += designer.monthDesignerPayout;
      continue;
    }

    grouped.set(designer.storeId, {
      storeId: designer.storeId,
      storeName: designer.storeName,
      storeRegion: designer.storeRegion,
      designers: [designer],
      customerCount: designer.customerCount,
      treatmentCount: designer.treatmentCount,
      monthTreatmentCount: designer.monthTreatmentCount,
      monthGrossSales: designer.monthGrossSales,
      monthHqRevenue: designer.monthHqRevenue,
      monthRevenue: designer.monthDesignerPayout,
    });
  }

  const storeOrder = ORG_STORE_DEFINITIONS.map((store) => store.id);

  return [...grouped.values()].sort((a, b) => {
    const left = storeOrder.indexOf(a.storeId);
    const right = storeOrder.indexOf(b.storeId);

    if (left === -1 && right === -1) {
      return a.storeName.localeCompare(b.storeName, 'ko');
    }

    if (left === -1) {
      return 1;
    }

    if (right === -1) {
      return -1;
    }

    return left - right;
  });
}
