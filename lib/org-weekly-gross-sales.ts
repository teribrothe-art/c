import {
  buildWeeklyGrossSalesWeeks,
  resolveDefaultWeekKey,
  type WeeklyRevenueWeek,
} from './designer-revenue-weekly';
import { getOrgDesignerRoster } from './org-designer-roster';
import type { OrgScope } from './org-access';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import { listPaymentsForDesignerId, type PaymentRecord } from './payment-record';

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

export type OrgWeeklyGrossSalesSnapshot = {
  weeks: WeeklyRevenueWeek[];
  selectedWeekKey: string;
  selectedWeek: WeeklyRevenueWeek;
};

async function listOrgPayments(scope: OrgScope, storeOrgId?: string) {
  const roster = getOrgDesignerRoster(scope, storeOrgId);
  const paymentGroups = await Promise.all(
    roster.map((entry) => listPaymentsForDesignerId(entry.id)),
  );

  return paymentGroups.flat().filter((payment) => RECOGNIZED_REVENUE_STATUSES.has(payment.status));
}

export async function fetchOrgWeeklyGrossSales(
  scope: OrgScope,
  monthKey: string,
  options?: { weekKey?: string; storeOrgId?: string },
): Promise<OrgWeeklyGrossSalesSnapshot> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const payments = await listOrgPayments(scope, storeOrgId);
  const weeks = buildWeeklyGrossSalesWeeks(payments, monthKey);
  const selectedWeekKey = options?.weekKey ?? resolveDefaultWeekKey(weeks, monthKey);
  const selectedWeek =
    weeks.find((week) => week.weekKey === selectedWeekKey) ?? weeks[0] ?? {
      weekKey: selectedWeekKey,
      label: '',
      days: [],
      weekTotal: 0,
      settlementCount: 0,
    };

  return {
    weeks,
    selectedWeekKey,
    selectedWeek,
  };
}
