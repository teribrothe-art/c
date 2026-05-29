import { PLATFORM_FEE_RATE } from './payment-fees';
import { getDesignerStoreAffiliation } from './org-store-affiliation';

/** 플랫폼 수수료 제외 후 매장·디자이너 분배 비율 (합계 100) */
export type StoreDesignerRevenueSplit = {
  storeId: string;
  storeSharePercent: number;
  designerSharePercent: number;
  platformFeePercent: number;
  label: string;
};

const DEFAULT_SPLIT: Omit<StoreDesignerRevenueSplit, 'storeId'> = {
  storeSharePercent: 32,
  designerSharePercent: 68,
  platformFeePercent: Math.round(PLATFORM_FEE_RATE * 1000) / 10,
  label: '표준 분배',
};

/** 매장별 기본 분배율 (데모) */
const SPLIT_BY_STORE_ID: Record<string, Omit<StoreDesignerRevenueSplit, 'storeId'>> = {
  'virtual-store-hot-gangnam': {
    storeSharePercent: 38,
    designerSharePercent: 62,
    platformFeePercent: 4,
    label: '강남 핫플레이스',
  },
  'virtual-store-hot-hongdae': {
    storeSharePercent: 34,
    designerSharePercent: 66,
    platformFeePercent: 4,
    label: '홍대·연남',
  },
  'virtual-store-hot-seongsu': {
    storeSharePercent: 30,
    designerSharePercent: 70,
    platformFeePercent: 4,
    label: '성수',
  },
  'virtual-store-hot-busan': {
    storeSharePercent: 28,
    designerSharePercent: 72,
    platformFeePercent: 4,
    label: '해운대·광안리',
  },
};

export function getStoreDesignerRevenueSplit(storeId: string): StoreDesignerRevenueSplit {
  const preset = SPLIT_BY_STORE_ID[storeId] ?? DEFAULT_SPLIT;

  return {
    storeId,
    ...preset,
  };
}

export function getStoreDesignerRevenueSplitForDesigner(designerId: string) {
  const affiliation = getDesignerStoreAffiliation(designerId);

  if (!affiliation) {
    return null;
  }

  return {
    store: affiliation.store,
    split: getStoreDesignerRevenueSplit(affiliation.store.id),
  };
}

export type TreatmentRevenueSplitBreakdown = {
  grossAmount: number;
  platformFee: number;
  distributableAmount: number;
  storeAmount: number;
  designerAmount: number;
  storeSharePercent: number;
  designerSharePercent: number;
  platformFeePercent: number;
};

export function calculateTreatmentRevenueSplit(
  grossAmount: number,
  split: Pick<
    StoreDesignerRevenueSplit,
    'storeSharePercent' | 'designerSharePercent' | 'platformFeePercent'
  >,
): TreatmentRevenueSplitBreakdown {
  const platformFeePercent = split.platformFeePercent ?? DEFAULT_SPLIT.platformFeePercent;
  const platformFee = Math.round((grossAmount * platformFeePercent) / 100);
  const distributableAmount = Math.max(0, grossAmount - platformFee);
  const storeAmount = Math.round((distributableAmount * split.storeSharePercent) / 100);
  const designerAmount = Math.max(0, distributableAmount - storeAmount);

  return {
    grossAmount,
    platformFee,
    distributableAmount,
    storeAmount,
    designerAmount,
    storeSharePercent: split.storeSharePercent,
    designerSharePercent: split.designerSharePercent,
    platformFeePercent,
  };
}

export type DesignerStoreSplitMonthSummary = {
  monthKey: string;
  monthLabel: string;
  treatmentCount: number;
  grossTotal: number;
  platformTotal: number;
  storeTotal: number;
  designerTotal: number;
};

export function formatSplitMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');

  if (!year || !month) {
    return monthKey;
  }

  return `${year}년 ${Number(month)}월`;
}

export function summarizeDesignerStoreSplitForMonth(
  entries: { treatmentDate: string; amount: number }[],
  split: StoreDesignerRevenueSplit,
  monthKey?: string,
): DesignerStoreSplitMonthSummary {
  const targetMonth = monthKey ?? new Date().toISOString().slice(0, 7);
  const filtered = entries.filter((entry) => entry.treatmentDate.slice(0, 7) === targetMonth);

  let grossTotal = 0;
  let platformTotal = 0;
  let storeTotal = 0;
  let designerTotal = 0;

  for (const entry of filtered) {
    const breakdown = calculateTreatmentRevenueSplit(entry.amount, split);
    grossTotal += breakdown.grossAmount;
    platformTotal += breakdown.platformFee;
    storeTotal += breakdown.storeAmount;
    designerTotal += breakdown.designerAmount;
  }

  return {
    monthKey: targetMonth,
    monthLabel: formatSplitMonthLabel(targetMonth),
    treatmentCount: filtered.length,
    grossTotal,
    platformTotal,
    storeTotal,
    designerTotal,
  };
}

