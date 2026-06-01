import type { OrgMonthlySalesCatalogItem, OrgMonthlySalesSummary } from './org-monthly-sales';
import type { SalesFilterContext, SalesFilterDrillLevel } from './org-sales-filter-context';
import type { SegmentDayRow, SegmentWeekRow } from './org-sales-segment-drilldown';
import type { OrgWeeklySalesSummary, SalesPeriodMode, WeeklySalesSegment } from './org-weekly-sales';

function segmentLabel(segment: WeeklySalesSegment) {
  return segment === 'weekend' ? '주말' : '평일';
}

export function buildSalesFilterContext(options: {
  periodMode: SalesPeriodMode;
  segment: WeeklySalesSegment;
  drillLevel: SalesFilterDrillLevel;
  weeklySummary: OrgWeeklySalesSummary;
  monthlySummary?: OrgMonthlySalesSummary | null;
  monthlyCatalog?: OrgMonthlySalesCatalogItem[];
  activeMonthKey?: string;
  selectedWeekLabel?: string;
  weekRows?: SegmentWeekRow[];
  dayRows?: SegmentDayRow[];
}): SalesFilterContext {
  const {
    periodMode,
    segment,
    drillLevel,
    weeklySummary,
    monthlySummary = null,
    monthlyCatalog = [],
    activeMonthKey,
    selectedWeekLabel = '',
    weekRows = [],
    dayRows = [],
  } = options;

  const segmentBuckets =
    periodMode === 'monthly' && monthlySummary
      ? {
          weekday: monthlySummary.weekday,
          weekend: monthlySummary.weekend,
        }
      : {
          weekday: weeklySummary.weekday,
          weekend: weeklySummary.weekend,
        };
  const bucket = segment === 'weekend' ? segmentBuckets.weekend : segmentBuckets.weekday;

  let grossSales = bucket.grossSales;
  let titleLabel = '';

  if (periodMode === 'monthly') {
    const monthLabel =
      monthlySummary?.monthLabel ??
      monthlyCatalog.find((month) => month.monthKey === activeMonthKey)?.label ??
      '월별';

    if (drillLevel === 'days') {
      if (dayRows.length > 0) {
        grossSales = dayRows.reduce((sum, row) => sum + row.grossSales, 0);
      } else {
        const weekRow = weekRows.find((row) => row.weekLabel === selectedWeekLabel);

        grossSales = weekRow?.grossSales ?? bucket.grossSales;
      }

      titleLabel = selectedWeekLabel
        ? `${monthLabel} · ${segmentLabel(segment)} · ${selectedWeekLabel}`
        : `${monthLabel} · ${segmentLabel(segment)}`;
    } else {
      titleLabel = `${monthLabel} · ${segmentLabel(segment)}`;
    }
  } else if (drillLevel === 'days') {
    if (dayRows.length > 0) {
      grossSales = dayRows.reduce((sum, row) => sum + row.grossSales, 0);
    } else {
      const weekRow = weekRows.find((row) => row.weekLabel === selectedWeekLabel);

      grossSales = weekRow?.grossSales ?? bucket.grossSales;
    }

    titleLabel = selectedWeekLabel
      ? `이번 주 · ${segmentLabel(segment)} · ${selectedWeekLabel}`
      : `이번 주 · ${segmentLabel(segment)}`;
  } else {
    titleLabel = `이번 주 · ${segmentLabel(segment)}`;
  }

  return {
    periodMode,
    segment,
    drillLevel,
    monthKey: periodMode === 'monthly' ? activeMonthKey : undefined,
    grossSales,
    titleLabel,
  };
}
