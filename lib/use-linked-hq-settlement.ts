import { useEffect, useState } from 'react';

import type { SalesFilterContext } from './org-sales-filter-context';
import {
  settlementTotalsFromGross,
  type OrgMonthSettlementTotals,
} from './org-month-settlement';
import { getActiveRevenueSplitConfig } from './revenue-split-approval';

export function useLinkedHqSettlementTotals(
  context: SalesFilterContext | null,
): OrgMonthSettlementTotals | null {
  const [totals, setTotals] = useState<OrgMonthSettlementTotals | null>(null);

  useEffect(() => {
    if (!context) {
      setTotals(null);
      return;
    }

    let cancelled = false;

    void getActiveRevenueSplitConfig().then((config) => {
      if (cancelled) {
        return;
      }

      setTotals(settlementTotalsFromGross(context.grossSales, config));
    });

    return () => {
      cancelled = true;
    };
  }, [
    context?.drillLevel,
    context?.grossSales,
    context?.monthKey,
    context?.periodMode,
    context?.segment,
    context?.titleLabel,
  ]);

  return totals;
}
