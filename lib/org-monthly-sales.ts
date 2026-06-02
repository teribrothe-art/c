import type { OrgScope } from './org-access';
import { formatMonthKeyLabel } from './designer-revenue-analytics';
import { getOrgDesignerRoster } from './org-designer-roster';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import { listPaymentsForDesignerId, type PaymentRecord } from './payment-record';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import { calculateRevenueSplit } from './revenue-split-config';
import {
  getNationwideDesignerDefinition,
  getNationwideStoreById,
  isNationwideDesignerId,
  type NationwideDesignerDefinition,
} from './nationwide-org-catalog';
import { forEachVisitInCycle } from './customer-visit-cycle-simulator';
import { isWeekendDateString } from './customer-treatment-patterns';
import type { WeeklySalesBucket } from './org-weekly-sales';

export type OrgMonthlySalesCatalogItem = {
  monthKey: string;
  label: string;
  grossSales: number;
  treatmentCount: number;
};

export type OrgMonthlySalesSummary = {
  monthKey: string;
  monthLabel: string;
  weekday: WeeklySalesBucket;
  weekend: WeeklySalesBucket;
};

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

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

function mergeBuckets(target: WeeklySalesBucket, source: WeeklySalesBucket) {
  target.grossSales += source.grossSales;
  target.hqRevenue += source.hqRevenue;
  target.treatmentCount += source.treatmentCount;
}

function addSplitToBucket(bucket: WeeklySalesBucket, amount: number, config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>) {
  const split = calculateRevenueSplit(amount, config);

  bucket.grossSales += split.grossAmount;
  bucket.hqRevenue += split.hqFeeAmount;
  bucket.treatmentCount += 1;
}

function listRecentMonthKeys(count = 12, reference = new Date()) {
  const keys: string[] = [];
  const cursor = new Date(reference);

  for (let index = 0; index < count; index += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return keys;
}

function lastDateOfMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(year, month, 0);

  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, '0');
  const d = String(last.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

async function listLegacyPaymentsForOrgScope(scope: OrgScope, storeOrgId?: string) {
  const roster = getOrgDesignerRoster(scope, storeOrgId).filter(
    (entry) => !isNationwideDesignerId(entry.id),
  );
  const paymentGroups = await Promise.all(
    roster.map((entry) => listPaymentsForDesignerId(entry.id)),
  );

  return paymentGroups.flat();
}

function listNationwideDesignerIdsForScope(scope: OrgScope, storeOrgId?: string) {
  return getOrgDesignerRoster(scope, storeOrgId)
    .filter((entry) => isNationwideDesignerId(entry.id))
    .map((entry) => entry.id);
}

function sumLegacyMonthBuckets(
  payments: PaymentRecord[],
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
) {
  const weekday = emptyBucket();
  const weekend = emptyBucket();
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDateOfMonth(monthKey);

  for (const payment of payments) {
    if (!RECOGNIZED_REVENUE_STATUSES.has(payment.status)) {
      continue;
    }

    const date = settlementDateOf(payment);

    if (date < monthStart || date > monthEnd) {
      continue;
    }

    const bucket = isWeekendDate(date) ? weekend : weekday;
    addSplitToBucket(bucket, payment.amount, config);
  }

  return { weekday, weekend };
}

function sumNationwideDesignerMonthBuckets(
  definition: NationwideDesignerDefinition,
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
) {
  const referenceDate = new Date(`${lastDateOfMonth(monthKey)}T12:00:00`);
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDateOfMonth(monthKey);
  const weekday = emptyBucket();
  const weekend = emptyBucket();
  const priceRegion = getNationwideStoreById(definition.storeId)?.region ?? '전국';

  forEachVisitInCycle(
    {
      customerIds: definition.customers.map((customer) => customer.id),
      historyYears: definition.historyYears,
      dailyMin: definition.dailyMin,
      dailyMax: definition.dailyMax,
      priceRegion,
      referenceDate,
    },
    (visit) => {
      if (visit.date < monthStart || visit.date > monthEnd) {
        return;
      }

      const bucket = isWeekendDateString(visit.date) ? weekend : weekday;
      addSplitToBucket(bucket, visit.price, config);
    },
  );

  return { weekday, weekend };
}

export function sumNationwideMonthlyBuckets(
  designerIds: string[],
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
) {
  const weekday = emptyBucket();
  const weekend = emptyBucket();

  for (const designerId of designerIds) {
    const definition = getNationwideDesignerDefinition(designerId);

    if (!definition) {
      continue;
    }

    const buckets = sumNationwideDesignerMonthBuckets(definition, monthKey, config);
    mergeBuckets(weekday, buckets.weekday);
    mergeBuckets(weekend, buckets.weekend);
  }

  return { weekday, weekend };
}

export function buildOrgMonthlySalesSummary(
  legacyPayments: PaymentRecord[],
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
  nationwideBuckets?: { weekday: WeeklySalesBucket; weekend: WeeklySalesBucket },
): OrgMonthlySalesSummary {
  const legacy = sumLegacyMonthBuckets(legacyPayments, monthKey, config);
  const weekday = { ...legacy.weekday };
  const weekend = { ...legacy.weekend };

  if (nationwideBuckets) {
    mergeBuckets(weekday, nationwideBuckets.weekday);
    mergeBuckets(weekend, nationwideBuckets.weekend);
  }

  return {
    monthKey,
    monthLabel: formatMonthKeyLabel(monthKey),
    weekday,
    weekend,
  };
}

export async function fetchOrgMonthlySalesSummary(
  scope: OrgScope,
  monthKey: string,
  options?: { storeOrgId?: string },
): Promise<OrgMonthlySalesSummary> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const config = await getActiveRevenueSplitConfig();
  const nationwideIds = listNationwideDesignerIdsForScope(scope, storeOrgId);
  const [legacyPayments, nationwideBuckets] = await Promise.all([
    listLegacyPaymentsForOrgScope(scope, storeOrgId),
    Promise.resolve(sumNationwideMonthlyBuckets(nationwideIds, monthKey, config)),
  ]);

  return buildOrgMonthlySalesSummary(legacyPayments, monthKey, config, nationwideBuckets);
}

export async function fetchOrgMonthlySalesCatalog(
  scope: OrgScope,
  options?: { storeOrgId?: string; monthCount?: number },
): Promise<OrgMonthlySalesCatalogItem[]> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const monthKeys = listRecentMonthKeys(options?.monthCount ?? 12);
  const config = await getActiveRevenueSplitConfig();
  const nationwideIds = listNationwideDesignerIdsForScope(scope, storeOrgId);
  const legacyPayments = await listLegacyPaymentsForOrgScope(scope, storeOrgId);

  const totals = new Map(
    monthKeys.map((monthKey) => [
      monthKey,
      { grossSales: 0, treatmentCount: 0, label: formatMonthKeyLabel(monthKey) },
    ]),
  );

  for (const payment of legacyPayments) {
    if (!RECOGNIZED_REVENUE_STATUSES.has(payment.status)) {
      continue;
    }

    const monthKey = settlementDateOf(payment).slice(0, 7);
    const bucket = totals.get(monthKey);

    if (!bucket) {
      continue;
    }

    bucket.grossSales += payment.amount;
    bucket.treatmentCount += 1;
  }

  for (const monthKey of monthKeys) {
    const nationwideBuckets = sumNationwideMonthlyBuckets(nationwideIds, monthKey, config);
    const bucket = totals.get(monthKey);

    if (!bucket) {
      continue;
    }

    bucket.grossSales += nationwideBuckets.weekday.grossSales + nationwideBuckets.weekend.grossSales;
    bucket.treatmentCount +=
      nationwideBuckets.weekday.treatmentCount + nationwideBuckets.weekend.treatmentCount;
  }

  return monthKeys.map((monthKey) => {
    const bucket = totals.get(monthKey)!;

    return {
      monthKey,
      label: bucket.label,
      grossSales: bucket.grossSales,
      treatmentCount: bucket.treatmentCount,
    };
  });
}

export function filterMonthlyCatalogByQuery(
  catalog: OrgMonthlySalesCatalogItem[],
  query: string,
) {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return catalog;
  }

  return catalog.filter((item) => {
    const haystack = `${item.label} ${item.monthKey}`.toLowerCase();

    return haystack.includes(trimmed);
  });
}
