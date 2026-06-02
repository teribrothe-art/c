import type { OrgScope } from './org-access';
import { formatDateWithWeekday, getWeekStartMonday, toLocalDateString } from './designer-revenue-weekly';
import { getOrgDesignerRoster } from './org-designer-roster';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import { listPaymentsForDesignerId, type PaymentRecord } from './payment-record';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import { calculateRevenueSplit } from './revenue-split-config';
import {
  getNationwideDesignerDefinition,
  isNationwideDesignerId,
  type NationwideDesignerDefinition,
} from './nationwide-org-catalog';
import { forEachVisitInCycle } from './customer-visit-cycle-simulator';
import { getNationwideStoreById } from './nationwide-org-catalog';
import type { SalesPeriodMode, WeeklySalesSegment } from './org-weekly-sales';

export type SegmentSalesBucket = {
  grossSales: number;
  treatmentCount: number;
};

export type SegmentWeekRow = {
  weekKey: string;
  weekLabel: string;
  grossSales: number;
  treatmentCount: number;
};

export type SegmentDayRow = {
  date: string;
  label: string;
  grossSales: number;
  treatmentCount: number;
};

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

function addDaysIso(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);

  return toLocalDateString(parsed);
}

function lastDateOfMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(year, month, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, '0');
  const d = String(last.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function formatWeekLabel(weekStart: string) {
  const weekEnd = addDaysIso(weekStart, 6);
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

function matchesSegment(date: string, segment: WeeklySalesSegment) {
  return segment === 'weekend' ? isWeekendDate(date) : !isWeekendDate(date);
}

function emptyBucket(): SegmentSalesBucket {
  return { grossSales: 0, treatmentCount: 0 };
}

function addToDailyMap(
  map: Map<string, SegmentSalesBucket>,
  date: string,
  grossAmount: number,
) {
  const bucket = map.get(date) ?? emptyBucket();
  bucket.grossSales += grossAmount;
  bucket.treatmentCount += 1;
  map.set(date, bucket);
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

function accumulateNationwideDailyMap(
  designerIds: string[],
  config: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>,
  rangeStart: string,
  rangeEnd: string,
  map: Map<string, SegmentSalesBucket>,
) {
  const referenceDate = new Date(`${rangeEnd}T12:00:00`);

  for (const designerId of designerIds) {
    const definition = getNationwideDesignerDefinition(designerId);

    if (!definition) {
      continue;
    }

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
        if (visit.date < rangeStart || visit.date > rangeEnd) {
          return;
        }

        const split = calculateRevenueSplit(visit.price, config);
        addToDailyMap(map, visit.date, split.grossAmount);
      },
    );
  }
}

async function buildDailyGrossMap(
  scope: OrgScope,
  rangeStart: string,
  rangeEnd: string,
  storeOrgId?: string,
) {
  const config = await getActiveRevenueSplitConfig();
  const map = new Map<string, SegmentSalesBucket>();
  const legacyPayments = await listLegacyPaymentsForOrgScope(scope, storeOrgId);
  const nationwideIds = listNationwideDesignerIdsForScope(scope, storeOrgId);

  for (const payment of legacyPayments) {
    if (!RECOGNIZED_REVENUE_STATUSES.has(payment.status)) {
      continue;
    }

    const date = settlementDateOf(payment);

    if (date < rangeStart || date > rangeEnd) {
      continue;
    }

    const split = calculateRevenueSplit(payment.amount, config);
    addToDailyMap(map, date, split.grossAmount);
  }

  accumulateNationwideDailyMap(nationwideIds, config, rangeStart, rangeEnd, map);

  return map;
}

function resolveDateRange(options: {
  periodMode: SalesPeriodMode;
  monthKey?: string;
  weekCount?: number;
}) {
  const today = toLocalDateString();

  if (options.periodMode === 'monthly' && options.monthKey) {
    return {
      rangeStart: `${options.monthKey}-01`,
      rangeEnd: lastDateOfMonth(options.monthKey),
    };
  }

  const weekCount = options.weekCount ?? 8;
  const currentWeekStart = getWeekStartMonday(today);
  const rangeStart = addDaysIso(currentWeekStart, -(weekCount - 1) * 7);

  return { rangeStart, rangeEnd: today };
}

export async function fetchOrgSegmentWeekRows(
  scope: OrgScope,
  segment: WeeklySalesSegment,
  options: {
    periodMode: SalesPeriodMode;
    monthKey?: string;
    storeOrgId?: string;
    weekCount?: number;
  },
): Promise<SegmentWeekRow[]> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options.storeOrgId);
  const { rangeStart, rangeEnd } = resolveDateRange(options);
  const dailyMap = await buildDailyGrossMap(scope, rangeStart, rangeEnd, storeOrgId);
  const weekMap = new Map<string, SegmentSalesBucket>();

  for (const [date, bucket] of dailyMap.entries()) {
    if (!matchesSegment(date, segment)) {
      continue;
    }

    const weekKey = getWeekStartMonday(date);
    const weekBucket = weekMap.get(weekKey) ?? emptyBucket();
    weekBucket.grossSales += bucket.grossSales;
    weekBucket.treatmentCount += bucket.treatmentCount;
    weekMap.set(weekKey, weekBucket);
  }

  return [...weekMap.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([weekKey, bucket]) => ({
      weekKey,
      weekLabel: formatWeekLabel(weekKey),
      grossSales: bucket.grossSales,
      treatmentCount: bucket.treatmentCount,
    }));
}

export async function fetchOrgSegmentDayRows(
  scope: OrgScope,
  segment: WeeklySalesSegment,
  weekKey: string,
  options?: { storeOrgId?: string },
): Promise<SegmentDayRow[]> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const rangeStart = weekKey;
  const rangeEnd = addDaysIso(weekKey, 6);
  const dailyMap = await buildDailyGrossMap(scope, rangeStart, rangeEnd, storeOrgId);
  const rows: SegmentDayRow[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDaysIso(weekKey, offset);

    if (!matchesSegment(date, segment)) {
      continue;
    }

    const bucket = dailyMap.get(date) ?? emptyBucket();

    rows.push({
      date,
      label: formatDateWithWeekday(date),
      grossSales: bucket.grossSales,
      treatmentCount: bucket.treatmentCount,
    });
  }

  return rows;
}
