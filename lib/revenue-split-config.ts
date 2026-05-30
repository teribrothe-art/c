/** 본사·매장·디자이너 수수료 비율 (%, 조정 가능) */
export type RevenueSplitConfig = {
  /** 카드(PG) 수수료 — 매출에서 먼저 제외 */
  cardFeePercent: number;
  /** 본사 수수료 — 매출(총액) 기준 % */
  hqFeePercent: number;
  /** 잔여 분배: 디자이너 몫 % */
  designerSharePercent: number;
  /** 잔여 분배: 매장 몫 % */
  storeSharePercent: number;
};

export type RevenueSplitBreakdown = {
  grossAmount: number;
  cardFeeAmount: number;
  hqFeeAmount: number;
  designerPayout: number;
  storePayout: number;
  poolAfterDeductions: number;
};

export const DEFAULT_REVENUE_SPLIT_CONFIG: RevenueSplitConfig = {
  cardFeePercent: 2.9,
  hqFeePercent: 4,
  designerSharePercent: 70,
  storeSharePercent: 30,
};

export const REVENUE_SPLIT_PARTY_LABELS = {
  admin: '본사',
  store: '매장',
  designer: '디자이너',
} as const;

export type RevenueSplitParty = keyof typeof REVENUE_SPLIT_PARTY_LABELS;

export function normalizeRevenueSplitConfig(
  input: Partial<RevenueSplitConfig>,
): RevenueSplitConfig {
  const designerSharePercent = clampPercent(input.designerSharePercent ?? 70);
  const storeSharePercent = clampPercent(input.storeSharePercent ?? 30);
  const shareSum = designerSharePercent + storeSharePercent;

  return {
    cardFeePercent: clampPercent(input.cardFeePercent ?? 2.9),
    hqFeePercent: clampPercent(input.hqFeePercent ?? 4),
    designerSharePercent:
      shareSum === 0 ? 70 : Math.round((designerSharePercent / shareSum) * 1000) / 10,
    storeSharePercent:
      shareSum === 0 ? 30 : Math.round((storeSharePercent / shareSum) * 1000) / 10,
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

/**
 * 카드 수수료 제외 → 본사(매출 %) → 잔여를 디자이너·매장 비율로 분배
 */
export function calculateRevenueSplit(
  grossAmount: number,
  config: RevenueSplitConfig = DEFAULT_REVENUE_SPLIT_CONFIG,
): RevenueSplitBreakdown {
  const gross = Math.max(0, Math.round(grossAmount));
  const cardFeeAmount = Math.round((gross * config.cardFeePercent) / 100);
  const afterCard = gross - cardFeeAmount;
  const hqFeeAmount = Math.round((gross * config.hqFeePercent) / 100);
  const poolAfterDeductions = Math.max(0, afterCard - hqFeeAmount);
  const shareTotal = config.designerSharePercent + config.storeSharePercent;
  const designerRatio = shareTotal > 0 ? config.designerSharePercent / shareTotal : 0.7;
  const designerPayout = Math.round(poolAfterDeductions * designerRatio);
  const storePayout = poolAfterDeductions - designerPayout;

  return {
    grossAmount: gross,
    cardFeeAmount,
    hqFeeAmount,
    designerPayout,
    storePayout,
    poolAfterDeductions,
  };
}

export function formatRevenueSplitSummary(config: RevenueSplitConfig) {
  return `카드 ${config.cardFeePercent}% 제외 · 본사 매출 ${config.hqFeePercent}% · 디자이너 ${config.designerSharePercent}:${config.storeSharePercent}`;
}

export function configsEqual(a: RevenueSplitConfig, b: RevenueSplitConfig) {
  return (
    a.cardFeePercent === b.cardFeePercent &&
    a.hqFeePercent === b.hqFeePercent &&
    a.designerSharePercent === b.designerSharePercent &&
    a.storeSharePercent === b.storeSharePercent
  );
}
