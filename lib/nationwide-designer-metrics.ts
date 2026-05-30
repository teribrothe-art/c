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

const TREATMENT_TEMPLATE_WEIGHTS = [
  { price: 120000, weight: 28 },
  { price: 180000, weight: 18 },
  { price: 220000, weight: 14 },
  { price: 280000, weight: 10 },
  { price: 90000, weight: 16 },
  { price: 110000, weight: 14 },
  { price: 260000, weight: 8 },
] as const;

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

function dailyVisitCount(dayIndex: number, dailyMin: number, dailyMax: number) {
  const span = dailyMax - dailyMin + 1;

  return dailyMin + (dayIndex % span);
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

function weightedAveragePrice() {
  const totalWeight = TREATMENT_TEMPLATE_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = TREATMENT_TEMPLATE_WEIGHTS.reduce(
    (sum, item) => sum + item.price * item.weight,
    0,
  );

  return Math.round(weightedSum / totalWeight);
}

const BASE_TREATMENT_PRICE = weightedAveragePrice();

function priceForTreatment(slot: number, dayIndex: number, slotInDay: number) {
  const templatePick = hashSeed(slot, dayIndex, slotInDay) % TREATMENT_TEMPLATE_WEIGHTS.length;
  const template = TREATMENT_TEMPLATE_WEIGHTS[templatePick] ?? TREATMENT_TEMPLATE_WEIGHTS[0];
  const jitter = (hashSeed(slot, dayIndex, slotInDay, 'price') % 4) * 10_000;

  return template.price + jitter;
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

function isWeekendDate(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();

  return day === 0 || day === 6;
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

  const seedStartDate = getSeedStartDate(definition.historyYears, referenceDate);
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
  let dayIndex = 0;

  for (
    let day = new Date(seedStartDate);
    day.getTime() <= endDate.getTime();
    day = addDays(day, 1)
  ) {
    const date = formatDate(day);
    const count = dailyVisitCount(dayIndex, definition.dailyMin, definition.dailyMax);
    totalTreatmentCount += count;

    for (let slotInDay = 0; slotInDay < count; slotInDay += 1) {
      const price = priceForTreatment(definition.slot, dayIndex, slotInDay);

      if (date.slice(0, 7) === monthKey) {
        monthTreatmentCount += 1;
        monthGrossSales += price;
      }

      if (date >= weekStart && date <= weekEnd) {
        const bucket = isWeekendDate(date) ? weeklyWeekend : weeklyWeekday;
        accumulateSplit(bucket, price, config);
      }
    }

    dayIndex += 1;
  }

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
