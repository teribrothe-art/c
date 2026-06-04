import type { SalesFilterContext } from './org-sales-filter-context';
import type { OrgMonthlySalesSummary } from './org-monthly-sales';
import { settlementTotalsFromGross, type OrgMonthSettlementTotals } from './org-month-settlement';
import { DEFAULT_REVENUE_SPLIT_CONFIG } from './revenue-split-config';
import type { OrgWeeklySalesSummary } from './org-weekly-sales';

export function sumWeeklyGrossSales(summary: OrgWeeklySalesSummary) {
  return summary.weekday.grossSales + summary.weekend.grossSales;
}

export function sumMonthlyGrossSales(
  monthlySummary: OrgMonthlySalesSummary | null | undefined,
  fallback = 0,
) {
  if (!monthlySummary) {
    return fallback;
  }

  return monthlySummary.weekday.grossSales + monthlySummary.weekend.grossSales;
}

export function settlementTotalsForSalesContext(
  context: SalesFilterContext | null,
  configuredHqRate: number,
): OrgMonthSettlementTotals | null {
  if (!context) {
    return null;
  }

  return settlementTotalsFromGross(context.grossSales, {
    ...DEFAULT_REVENUE_SPLIT_CONFIG,
    hqFeePercent: configuredHqRate,
  });
}
