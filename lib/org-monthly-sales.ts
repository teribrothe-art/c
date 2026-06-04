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
import {
  getTreatmentTemplatesForRegion,
  priceForRegionalTreatment,
} from './regional-treatment-pricing';
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

function hashSeed(...parts: (string | number)[]) {
  let hash = 0;

  for (const part of parts) {
    const text = String(part);

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
  }

  return hash;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function getSeedStartDate(historyYears: number, reference = new Date()) {
  const start = new Date(reference);
  start.setFullYear(start.getFullYear() - historyYears);
  start.setHours(12, 0, 0, 0);

  return start;
}

function priceForTreatment(
  definition: NationwideDesignerDefinition,
  dayIndex: number,
  slotInDay: number,
) {
  const region = getNationwideStoreById(definition.storeId)?.region ?? '전국';
  const templates = getTreatmentTemplatesForRegion(region);
  const templatePick = hashSeed(definition.slot, dayIndex, slotInDay) % templates.length;
  const template = templates[templatePick] ?? templates[0];

  return priceForRegionalTreatment(region, [definition.slot, dayIndex, slotInDay, template.type]);
}

function dailyVisitCount(dayIndex: number, dailyMin: number, dailyMax: number) {
  const span = dailyMax - dailyMin + 1;

  return dailyMin + (dayIndex % span);
}

function sumNationwideDesignerMonthBuckets(
  definition: NationwideDesignerDefinition,
  monthKey: string,
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
) {
  const referenceDate = new Date(`${lastDateOfMonth(monthKey)}T12:00:00`);
  const seedStartDate = getSeedStartDate(definition.historyYears, referenceDate);
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDateOfMonth(monthKey);
  const weekday = emptyBucket();
  const weekend = emptyBucket();
  let dayIndex = 0;

  for (
    let day = new Date(seedStartDate);
    day.getTime() <= referenceDate.getTime();
    day = addDays(day, 1)
  ) {
    const date = formatDate(day);

    if (date < monthStart || date > monthEnd) {
      dayIndex += 1;
      continue;
    }

    const count = dailyVisitCount(dayIndex, definition.dailyMin, definition.dailyMax);

    for (let slotInDay = 0; slotInDay < count; slotInDay += 1) {
      const price = priceForTreatment(definition, dayIndex, slotInDay);
      const bucket = isWeekendDate(date) ? weekend : weekday;
      addSplitToBucket(bucket, price, config);
    }

    dayIndex += 1;
  }

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
