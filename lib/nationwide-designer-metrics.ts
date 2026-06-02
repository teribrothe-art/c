import { getNationwideStoreById } from './nationwide-org-catalog';
import { forEachVisitInCycle } from './customer-visit-cycle-simulator';
import { isWeekendDateString } from './customer-treatment-patterns';
import { settlementTotalsFromGross } from './org-month-settlement';
import type { RevenueSplitConfig } from './revenue-split-config';
import { calculateRevenueSplit } from './revenue-split-config';
import { getWeekStartMonday, toLocalDateString } from './designer-revenue-weekly';
import type { OrgDesignerRosterEntry } from './org-designer-roster';
import type { OrgDesignerMetrics } from './org-aggregates';
import type { WeeklySalesBucket } from './org-weekly-sales';
import {
  getNationwideDesignerDefinition,
  type NationwideDesignerDefinition,
} from './nationwide-org-catalog';

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

function regionForDefinition(definition: NationwideDesignerDefinition) {
  return getNationwideStoreById(definition.storeId)?.region ?? '전국';
}

export type NationwideDesignerAggregate = {
  totalTreatmentCount: number;
  customerCount: number;
  monthGrossSales: number;
  monthTreatmentCount: number;
  monthHqRevenue: number;
  monthDesignerPayout: number;
  monthStoreShare: number;
  pendingPayoutAmount: number;
  weeklyWeekday: WeeklySalesBucket;
  weeklyWeekend: WeeklySalesBucket;
};

function addDaysToIso(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);

  return formatDate(parsed);
}

function emptyWeeklyBucket(): WeeklySalesBucket {
  return {
    grossSales: 0,
    hqRevenue: 0,
    treatmentCount: 0,
  };
}

const aggregateCache = new Map<string, NationwideDesignerAggregate>();

function cacheKeyForDefinition(definition: NationwideDesignerDefinition, referenceDate: Date) {
  return `${definition.designer.id}:${formatDate(referenceDate).slice(0, 7)}:${getWeekStartMonday(toLocalDateString(referenceDate))}`;
}

function accumulateSplit(
  bucket: { grossSales: number; hqRevenue: number; treatmentCount: number },
  amount: number,
  config: RevenueSplitConfig,
) {
  const split = calculateRevenueSplit(amount, config);

  bucket.grossSales += split.grossAmount;
  bucket.hqRevenue += split.hqFeeAmount;
  bucket.treatmentCount += 1;
}

export function computeNationwideDesignerAggregate(
  definition: NationwideDesignerDefinition,
  config: RevenueSplitConfig,
  referenceDate = new Date(),
): NationwideDesignerAggregate {
  const cacheKey = cacheKeyForDefinition(definition, referenceDate);
  const cached = aggregateCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const endDate = new Date(referenceDate);
  const monthKey = formatDate(referenceDate).slice(0, 7);
  const today = toLocalDateString(referenceDate);
  const weekStart = getWeekStartMonday(today);
  const weekEnd = addDaysToIso(weekStart, 6);

  let totalTreatmentCount = 0;
  let monthTreatmentCount = 0;
  let monthGrossSales = 0;
  const weeklyWeekday = emptyWeeklyBucket();
  const weeklyWeekend = emptyWeeklyBucket();
  const priceRegion = regionForDefinition(definition);

  forEachVisitInCycle(
    {
      customerIds: definition.customers.map((customer) => customer.id),
      historyYears: definition.historyYears,
      dailyMin: definition.dailyMin,
      dailyMax: definition.dailyMax,
      priceRegion,
      referenceDate: endDate,
    },
    (visit) => {
      totalTreatmentCount += 1;

      if (visit.date.slice(0, 7) === monthKey) {
        monthTreatmentCount += 1;
        monthGrossSales += visit.price;
      }

      if (visit.date >= weekStart && visit.date <= weekEnd) {
        const bucket = isWeekendDateString(visit.date) ? weeklyWeekend : weeklyWeekday;
        accumulateSplit(bucket, visit.price, config);
      }
    },
  );

  const settlement = settlementTotalsFromGross(monthGrossSales, config);
  const pendingRatio = 0.04 + (hashSeed(definition.slot, monthKey) % 6) * 0.01;

  const result = {
    totalTreatmentCount,
    customerCount: definition.customers.length,
    monthGrossSales,
    monthTreatmentCount,
    monthHqRevenue: settlement.monthHqRevenue,
    monthDesignerPayout: settlement.monthDesignerPayout,
    monthStoreShare: settlement.monthStoreShare,
    pendingPayoutAmount: Math.round(monthGrossSales * pendingRatio * 0.15),
    weeklyWeekday,
    weeklyWeekend,
  };

  aggregateCache.set(cacheKey, result);

  return result;
}

export function computeNationwideDesignerMetrics(
  entry: OrgDesignerRosterEntry,
  config: RevenueSplitConfig,
  referenceDate = new Date(),
): OrgDesignerMetrics {
  const definition = getNationwideDesignerDefinition(entry.id);

  if (!definition) {
    throw new Error(`전국 디자이너 정의 없음: ${entry.id}`);
  }

  const aggregate = computeNationwideDesignerAggregate(definition, config, referenceDate);

  return {
    ...entry,
    treatmentCount: aggregate.totalTreatmentCount,
    customerCount: aggregate.customerCount,
    monthRevenue: aggregate.monthDesignerPayout,
    monthGrossSales: aggregate.monthGrossSales,
    monthHqRevenue: aggregate.monthHqRevenue,
    monthDesignerPayout: aggregate.monthDesignerPayout,
    monthStoreShare: aggregate.monthStoreShare,
    monthTreatmentCount: aggregate.monthTreatmentCount,
    pendingPayoutAmount: aggregate.pendingPayoutAmount,
  };
}

export function sumNationwideWeeklyBuckets(
  designerIds: string[],
  config: RevenueSplitConfig,
  referenceDate = new Date(),
): { weekday: WeeklySalesBucket; weekend: WeeklySalesBucket } {
  const weekday = emptyWeeklyBucket();
  const weekend = emptyWeeklyBucket();

  for (const designerId of designerIds) {
    const definition = getNationwideDesignerDefinition(designerId);

    if (!definition) {
      continue;
    }

    const aggregate = computeNationwideDesignerAggregate(definition, config, referenceDate);

    weekday.grossSales += aggregate.weeklyWeekday.grossSales;
    weekday.hqRevenue += aggregate.weeklyWeekday.hqRevenue;
    weekday.treatmentCount += aggregate.weeklyWeekday.treatmentCount;
    weekend.grossSales += aggregate.weeklyWeekend.grossSales;
    weekend.hqRevenue += aggregate.weeklyWeekend.hqRevenue;
    weekend.treatmentCount += aggregate.weeklyWeekend.treatmentCount;
  }

  return { weekday, weekend };
}
