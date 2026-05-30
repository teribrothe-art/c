import { getActiveRevenueSplitConfig } from './revenue-split-approval';
import {
  calculateRevenueSplit,
  type RevenueSplitConfig,
} from './revenue-split-config';
import type { PaymentRecord } from './payment-record';

export type OrgMonthSettlementTotals = {
  /** 결제 완료·정산 기준 총 매출(시술 금액 합) */
  monthGrossSales: number;
  monthCardFee: number;
  monthPgFee: number;
  monthHqRevenue: number;
  monthDesignerPayout: number;
  monthStoreShare: number;
  /** 본사 수익 ÷ 총 매출 × 100 (수수료 구조 반영 실효 %) */
  hqYieldRate: number;
  /** 설정상 본사 매출 % (비교용) */
  configuredHqRate: number;
};

const RECOGNIZED_REVENUE_STATUSES = new Set<PaymentRecord['status']>([
  'completed',
  'paid',
  'in_escrow',
]);

function revenueMonthKey(payment: PaymentRecord) {
  return (payment.settled_at ?? payment.paid_at ?? payment.created_at ?? '').slice(0, 7);
}

/** 정산 완료 + 입금·에스크로 — 해당 월 매출 인식 */
function isRecognizedRevenueInMonth(payment: PaymentRecord, monthKey: string) {
  if (!RECOGNIZED_REVENUE_STATUSES.has(payment.status)) {
    return false;
  }

  return revenueMonthKey(payment) === monthKey;
}

export function settlementTotalsFromGross(
  monthGrossSales: number,
  config: RevenueSplitConfig,
): OrgMonthSettlementTotals {
  const split = calculateRevenueSplit(monthGrossSales, config);
  const hqYieldRate =
    monthGrossSales > 0 ? Math.round((split.hqFeeAmount / monthGrossSales) * 1000) / 10 : 0;

  return {
    monthGrossSales: split.grossAmount,
    monthCardFee: split.cardFeeAmount,
    monthPgFee: split.pgFeeAmount,
    monthHqRevenue: split.hqFeeAmount,
    monthDesignerPayout: split.designerPayout,
    monthStoreShare: split.storePayout,
    hqYieldRate,
    configuredHqRate: config.hqFeePercent,
  };
}

export function aggregateMonthSettlementFromPayments(
  payments: PaymentRecord[],
  monthKey: string,
  config: RevenueSplitConfig,
): OrgMonthSettlementTotals {
  let monthGrossSales = 0;
  let monthCardFee = 0;
  let monthPgFee = 0;
  let monthHqRevenue = 0;
  let monthDesignerPayout = 0;
  let monthStoreShare = 0;

  for (const payment of payments) {
    if (!isRecognizedRevenueInMonth(payment, monthKey)) {
      continue;
    }

    const split = calculateRevenueSplit(payment.amount, config);
    monthGrossSales += split.grossAmount;
    monthCardFee += split.cardFeeAmount;
    monthPgFee += split.pgFeeAmount;
    monthHqRevenue += split.hqFeeAmount;
    monthDesignerPayout += split.designerPayout;
    monthStoreShare += split.storePayout;
  }

  return {
    monthGrossSales,
    monthCardFee,
    monthPgFee,
    monthHqRevenue,
    monthDesignerPayout,
    monthStoreShare,
    hqYieldRate:
      monthGrossSales > 0 ? Math.round((monthHqRevenue / monthGrossSales) * 1000) / 10 : 0,
    configuredHqRate: config.hqFeePercent,
  };
}

export async function aggregateMonthSettlementForPayments(
  payments: PaymentRecord[],
  monthKey: string,
): Promise<OrgMonthSettlementTotals> {
  const config = await getActiveRevenueSplitConfig();

  return aggregateMonthSettlementFromPayments(payments, monthKey, config);
}

export function formatHqYieldRateLabel(totals: OrgMonthSettlementTotals) {
  return `${totals.hqYieldRate.toLocaleString('ko-KR')}%`;
}
