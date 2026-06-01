import type { BetaTestAccount } from './beta-test-accounts';
import type { AccumulatedSeedProfileConfig } from './demo-accumulated-seed-builder';

/** @deprecated 전국 1000 디자이너 카탈로그로 대체됨 — 하위 호환용 빈 배열 */
export const EXPANDED_DESIGNERS_PER_STORE = [] as const;

/** @deprecated */
export const EXPANDED_STORE_DESIGNER_DEFINITIONS: never[] = [];

/** @deprecated */
export const EXPANDED_STORE_DESIGNER_IDS: string[] = [];

/** @deprecated */
export const EXPANDED_STORE_DESIGNER_PROFILE_CONFIGS: AccumulatedSeedProfileConfig[] = [];

/** @deprecated */
export const EXPANDED_STORE_DESIGNERS_PUBLIC: never[] = [];

/** @deprecated */
export const EXPANDED_STORE_DESIGNER_ACCOUNTS: BetaTestAccount[] = [];

/** @deprecated */
export const EXPANDED_DESIGNER_IDS_BY_STORE: Record<string, string[]> = {};
