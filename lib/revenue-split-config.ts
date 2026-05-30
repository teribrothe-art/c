/** 본사·매장·디자이너 수수료 비율 (%, 조정 가능) */
export type RevenueSplitConfig = {
  /** 카드사 수수료 — 매출에서 먼저 제외 (국내 카드사 평균) */
  cardFeePercent: number;
  /** PG(결제대행) 수수료 — 매출에서 카드사 다음 차감 */
  pgFeePercent: number;
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
  pgFeeAmount: number;
  hqFeeAmount: number;
  designerPayout: number;
  storePayout: number;
  poolAfterDeductions: number;
};

/** 국내 카드사 가맹점 평균 수수료 (약 1.5~1.8%) */
export const CARD_COMPANY_AVERAGE_FEE_PERCENT = 1.65;

/** PG(결제대행) 기본 수수료 */
export const DEFAULT_PG_FEE_PERCENT = 1.25;

export const DEFAULT_REVENUE_SPLIT_CONFIG: RevenueSplitConfig = {
  cardFeePercent: CARD_COMPANY_AVERAGE_FEE_PERCENT,
  pgFeePercent: DEFAULT_PG_FEE_PERCENT,
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

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function migrateLegacyCardFee(input: Partial<RevenueSplitConfig>): Partial<RevenueSplitConfig> {
  if (input.pgFeePercent != null) {
    return input;
  }

  const card = input.cardFeePercent;

  // 예전에는 카드+PG가 cardFeePercent 하나(2.9%)로 저장됨
  if (card != null && card >= 2.5 && card <= 3.5) {
    return {
      ...input,
      cardFeePercent: CARD_COMPANY_AVERAGE_FEE_PERCENT,
      pgFeePercent: DEFAULT_PG_FEE_PERCENT,
    };
  }

  return {
    ...input,
    pgFeePercent: DEFAULT_PG_FEE_PERCENT,
  };
}

export function normalizeRevenueSplitConfig(
  input: Partial<RevenueSplitConfig>,
): RevenueSplitConfig {
  const migrated = migrateLegacyCardFee(input);
  const designerSharePercent = clampPercent(migrated.designerSharePercent ?? 70);
  const storeSharePercent = clampPercent(migrated.storeSharePercent ?? 30);
  const shareSum = designerSharePercent + storeSharePercent;

  return {
    cardFeePercent: clampPercent(migrated.cardFeePercent ?? CARD_COMPANY_AVERAGE_FEE_PERCENT),
    pgFeePercent: clampPercent(migrated.pgFeePercent ?? DEFAULT_PG_FEE_PERCENT),
    hqFeePercent: clampPercent(migrated.hqFeePercent ?? 4),
    designerSharePercent:
      shareSum === 0 ? 70 : Math.round((designerSharePercent / shareSum) * 1000) / 10,
    storeSharePercent:
      shareSum === 0 ? 30 : Math.round((storeSharePercent / shareSum) * 1000) / 10,
  };
}

/**
 * 카드사·PG 수수료 제외 → 본사(매출 %) → 잔여를 디자이너·매장 비율로 분배
 */
export function calculateRevenueSplit(
  grossAmount: number,
  config: RevenueSplitConfig = DEFAULT_REVENUE_SPLIT_CONFIG,
): RevenueSplitBreakdown {
  const gross = Math.max(0, Math.round(grossAmount));
  const cardFeeAmount = Math.round((gross * config.cardFeePercent) / 100);
  const pgFeeAmount = Math.round((gross * config.pgFeePercent) / 100);
  const afterPaymentFees = gross - cardFeeAmount - pgFeeAmount;
  const hqFeeAmount = Math.round((gross * config.hqFeePercent) / 100);
  const poolAfterDeductions = Math.max(0, afterPaymentFees - hqFeeAmount);
  const shareTotal = config.designerSharePercent + config.storeSharePercent;
  const designerRatio = shareTotal > 0 ? config.designerSharePercent / shareTotal : 0.7;
  const designerPayout = Math.round(poolAfterDeductions * designerRatio);
  const storePayout = poolAfterDeductions - designerPayout;

  return {
    grossAmount: gross,
    cardFeeAmount,
    pgFeeAmount,
    hqFeeAmount,
    designerPayout,
    storePayout,
    poolAfterDeductions,
  };
}

export function totalPaymentFeePercent(config: RevenueSplitConfig) {
  return config.cardFeePercent + config.pgFeePercent;
}

export function formatRevenueSplitSummary(config: RevenueSplitConfig) {
  return `카드 ${config.cardFeePercent}% · PG ${config.pgFeePercent}% 제외 · 본사 매출 ${config.hqFeePercent}% · 디자이너 ${config.designerSharePercent}:${config.storeSharePercent}`;
}

export function configsEqual(a: RevenueSplitConfig, b: RevenueSplitConfig) {
  return (
    a.cardFeePercent === b.cardFeePercent &&
    a.pgFeePercent === b.pgFeePercent &&
    a.hqFeePercent === b.hqFeePercent &&
    a.designerSharePercent === b.designerSharePercent &&
    a.storeSharePercent === b.storeSharePercent
  );
}
