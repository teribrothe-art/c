import type { OrgDashboardSummary } from './org-aggregates';
import type { OrgDashboardStatCardItem } from '../src/components/org-dashboard-stat-grid';

type SimulationStatSummary = Pick<
  OrgDashboardSummary,
  'monthRevenue' | 'monthTreatmentCount' | 'pendingPayoutAmount' | 'customerCount'
>;

type RouteHandlers = {
  onRevenue: () => void;
  onTreatments: () => void;
  onPending: () => void;
  onCustomers: () => void;
};

/** 가상 시뮬레이션 대시보드 — 이번 달 매출·시술·정산 대기·연결 고객 */
export function buildSimulationStatGridItems(
  summary: SimulationStatSummary,
  routes: RouteHandlers,
): OrgDashboardStatCardItem[] {
  return [
    {
      key: 'revenue',
      label: '이번 달 매출',
      value: summary.monthRevenue.toLocaleString('ko-KR'),
      meta: '원',
      onPress: routes.onRevenue,
    },
    {
      key: 'treatments',
      label: '이번 달 시술',
      value: summary.monthTreatmentCount.toLocaleString('ko-KR'),
      meta: '건',
      onPress: routes.onTreatments,
    },
    {
      key: 'pending',
      label: '정산 대기',
      value: summary.pendingPayoutAmount.toLocaleString('ko-KR'),
      meta: '원',
      onPress: routes.onPending,
    },
    {
      key: 'customers',
      label: '연결 고객',
      value: summary.customerCount.toLocaleString('ko-KR'),
      meta: '명',
      onPress: routes.onCustomers,
    },
  ];
}
