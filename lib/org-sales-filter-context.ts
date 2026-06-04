import type { SalesPeriodMode, WeeklySalesSegment } from './org-weekly-sales';

export type SalesFilterDrillLevel = 'summary' | 'weeks' | 'days';

export type SalesFilterContext = {
  periodMode: SalesPeriodMode;
  segment: WeeklySalesSegment;
  drillLevel: SalesFilterDrillLevel;
  monthKey?: string;
  grossSales: number;
  titleLabel: string;
};
