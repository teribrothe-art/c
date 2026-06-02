import type { OrgScope } from './org-access';
import { getWeekStartMonday, toLocalDateString } from './designer-revenue-weekly';
import { getOrgDesignerRoster } from './org-designer-roster';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import { listPaymentsForDesignerId, type PaymentRecord } from './payment-record';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import { calculateRevenueSplit } from './revenue-split-config';

export type WeeklySalesSegment = 'weekday' | 'weekend';

export type WeeklySalesBucket = {
  grossSales: number;
  hqRevenue: number;
  treatmentCount: number;
};

export type OrgWeeklySalesSummary = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  weekday: WeeklySalesBucket;
  weekend: WeeklySalesBucket;
};

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);

  return toLocalDateString(parsed);
}

function formatWeekLabel(weekStart: string, weekEnd: string) {
  const [, startMonth, startDay] = weekStart.split('-');
  const [, endMonth, endDay] = weekEnd.split('-');

  return `${Number(startMonth)}.${Number(startDay)} ~ ${Number(endMonth)}.${Number(endDay)}`;
}

function settlementDateOf(payment: PaymentRecord) {
  return (payment.settled_at ?? payment.paid_at ?? payment.created_at).slice(0, 10);
}

function isWeekendDate(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();

  return day === 0 || day === 6;
}

function emptyBucket(): WeeklySalesBucket {
  return {
    grossSales: 0,
    hqRevenue: 0,
    treatmentCount: 0,
  };
}

async function listPaymentsForOrgScope(scope: OrgScope, storeOrgId?: string) {
  const roster = getOrgDesignerRoster(scope, storeOrgId);
  const paymentGroups = await Promise.all(
    roster.map((entry) => listPaymentsForDesignerId(entry.id)),
  );

  return paymentGroups.flat();
}

export function buildOrgWeeklySalesSummary(
  payments: PaymentRecord[],
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
  referenceDate = new Date(),
): OrgWeeklySalesSummary {
  const today = toLocalDateString(referenceDate);
  const weekStart = getWeekStartMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const weekday = emptyBucket();
  const weekend = emptyBucket();

  for (const payment of payments) {
    if (!RECOGNIZED_REVENUE_STATUSES.has(payment.status)) {
      continue;
    }

    const date = settlementDateOf(payment);

    if (date < weekStart || date > weekEnd) {
      continue;
    }

    const split = calculateRevenueSplit(payment.amount, config);
    const bucket = isWeekendDate(date) ? weekend : weekday;

    bucket.grossSales += split.grossAmount;
    bucket.hqRevenue += split.hqFeeAmount;
    bucket.treatmentCount += 1;
  }

  return {
    weekStart,
    weekEnd,
    weekLabel: formatWeekLabel(weekStart, weekEnd),
    weekday,
    weekend,
  };
}

export async function fetchOrgWeeklySalesSummary(
  scope: OrgScope,
  options?: { storeOrgId?: string },
): Promise<OrgWeeklySalesSummary> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const [payments, config] = await Promise.all([
    listPaymentsForOrgScope(scope, storeOrgId),
    getActiveRevenueSplitConfig(),
  ]);

  return buildOrgWeeklySalesSummary(payments, config);
}

export function getWeeklySalesBucket(
  summary: OrgWeeklySalesSummary,
  segment: WeeklySalesSegment,
): WeeklySalesBucket {
  return segment === 'weekend' ? summary.weekend : summary.weekday;
}
