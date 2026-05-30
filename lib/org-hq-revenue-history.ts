import type { OrgScope } from './org-access';
import { formatMonthKeyLabel } from './designer-revenue-analytics';
import {
  aggregateMonthSettlementFromPayments,
  type OrgMonthSettlementTotals,
} from './org-month-settlement';
import { getOrgDesignerRoster } from './org-designer-roster';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import { listPaymentsForDesignerId, type PaymentRecord } from './payment-record';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';

export type HqMonthlyRevenueBucket = OrgMonthSettlementTotals & {
  monthKey: string;
  label: string;
};

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

function revenueMonthKey(payment: PaymentRecord) {
  return (payment.settled_at ?? payment.paid_at ?? payment.created_at ?? '').slice(0, 7);
}

function isRecognizedRevenue(payment: PaymentRecord) {
  return RECOGNIZED_REVENUE_STATUSES.has(payment.status);
}

async function listPaymentsForOrgScope(scope: OrgScope, storeOrgId?: string) {
  const roster = getOrgDesignerRoster(scope, storeOrgId);
  const paymentGroups = await Promise.all(
    roster.map((entry) => listPaymentsForDesignerId(entry.id)),
  );

  return paymentGroups.flat();
}

export function buildHqMonthlyRevenueBuckets(
  payments: PaymentRecord[],
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
  monthKeys?: string[],
): HqMonthlyRevenueBucket[] {
  const keys = new Set(monthKeys ?? []);

  for (const payment of payments) {
    if (!isRecognizedRevenue(payment)) {
      continue;
    }

    const monthKey = revenueMonthKey(payment);

    if (monthKey) {
      keys.add(monthKey);
    }
  }

  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => ({
      monthKey,
      label: formatMonthKeyLabel(monthKey),
      ...aggregateMonthSettlementFromPayments(payments, monthKey, config),
    }));
}

export async function fetchOrgHqRevenueHistory(
  scope: OrgScope,
  options?: { storeOrgId?: string },
): Promise<HqMonthlyRevenueBucket[]> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const [payments, config] = await Promise.all([
    listPaymentsForOrgScope(scope, storeOrgId),
    getActiveRevenueSplitConfig(),
  ]);

  const buckets = buildHqMonthlyRevenueBuckets(payments, config);

  if (buckets.length > 0) {
    return buckets;
  }

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  return [
    {
      monthKey: currentMonthKey,
      label: formatMonthKeyLabel(currentMonthKey),
      monthGrossSales: 0,
      monthCardFee: 0,
      monthPgFee: 0,
      monthHqRevenue: 0,
      monthDesignerPayout: 0,
      monthStoreShare: 0,
      hqYieldRate: 0,
      configuredHqRate: config.hqFeePercent,
    },
  ];
}

export function findHqMonthlyBucket(
  buckets: HqMonthlyRevenueBucket[],
  monthKey: string,
): HqMonthlyRevenueBucket | null {
  return buckets.find((bucket) => bucket.monthKey === monthKey) ?? null;
}
