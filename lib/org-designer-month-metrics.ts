import {
  aggregateMonthSettlementFromPayments,
  settlementTotalsFromGross,
  type OrgMonthSettlementTotals,
} from './org-month-settlement';
import type { PaymentRecord } from './payment-record';
import type { RevenueSplitConfig } from './revenue-split-config';
import type { Treatment } from './treatments';

function monthKeyFromTreatmentDate(treatment: Treatment) {
  return (treatment.treatment_date ?? '').slice(0, 7);
}

/** 이번 달 시술 기록 금액 합 (price > 0) */
export function grossSalesFromTreatmentsInMonth(treatments: Treatment[], monthKey: string) {
  let total = 0;

  for (const treatment of treatments) {
    if (monthKeyFromTreatmentDate(treatment) !== monthKey) {
      continue;
    }

    const price = treatment.price ?? 0;

    if (price > 0) {
      total += price;
    }
  }

  return total;
}

/** 결제 인식 매출과 시술 금액 중 큰 값으로 월 정산 합산 */
export function resolveDesignerMonthSettlement(
  treatments: Treatment[],
  payments: PaymentRecord[],
  monthKey: string,
  config: RevenueSplitConfig,
): OrgMonthSettlementTotals {
  const fromPayments = aggregateMonthSettlementFromPayments(payments, monthKey, config);
  const fromTreatments = grossSalesFromTreatmentsInMonth(treatments, monthKey);
  const monthGrossSales = Math.max(fromPayments.monthGrossSales, fromTreatments);

  if (monthGrossSales === fromPayments.monthGrossSales) {
    return fromPayments;
  }

  return settlementTotalsFromGross(monthGrossSales, config);
}
