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
  // "매출"은 결제(정산) 기준이 우선. 결제가 0인 경우에만 시술 금액 합으로 보정(데모/미연동 대비).
  if (fromPayments.monthGrossSales > 0) {
    return fromPayments;
  }

  return settlementTotalsFromGross(fromTreatments, config);
}
