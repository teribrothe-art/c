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
  monthHqRevenue: number;
  monthDesignerPayout: number;
  monthStoreShare: number;
  /** 본사 수익 ÷ 총 매출 × 100 (수수료 구조 반영 실효 %) */
  hqYieldRate: number;
  /** 설정상 본사 매출 % (비교용) */
  configuredHqRate: number;
};

function isCompletedInMonth(payment: PaymentRecord, monthKey: string) {
  if (payment.status !== 'completed') {
    return false;
  }

  const date = (payment.settled_at ?? payment.paid_at ?? payment.created_at).slice(0, 7);

  return date === monthKey;
}

export function aggregateMonthSettlementFromPayments(
  payments: PaymentRecord[],
  monthKey: string,
  config: RevenueSplitConfig,
): OrgMonthSettlementTotals {
  let monthGrossSales = 0;
  let monthCardFee = 0;
  let monthHqRevenue = 0;
  let monthDesignerPayout = 0;
  let monthStoreShare = 0;

  for (const payment of payments) {
    if (!isCompletedInMonth(payment, monthKey)) {
      continue;
    }

    const split = calculateRevenueSplit(payment.amount, config);
    monthGrossSales += split.grossAmount;
    monthCardFee += split.cardFeeAmount;
    monthHqRevenue += split.hqFeeAmount;
    monthDesignerPayout += split.designerPayout;
    monthStoreShare += split.storePayout;
  }

  const hqYieldRate =
    monthGrossSales > 0 ? Math.round((monthHqRevenue / monthGrossSales) * 1000) / 10 : 0;

  return {
    monthGrossSales,
    monthCardFee,
    monthHqRevenue,
    monthDesignerPayout,
    monthStoreShare,
    hqYieldRate,
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
