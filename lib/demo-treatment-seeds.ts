import { INITIAL_DEMO_TREATMENTS } from './demo-initial-treatments';
import { BETA_DEMO_TREATMENTS } from './beta-demo-treatments';
import type { Treatment } from './treatments';

/** 기본 데모 시술 + 베타 디자이너 1:1 연동 시술 */
export const ALL_DEMO_TREATMENT_SEEDS: Treatment[] = [
  ...(INITIAL_DEMO_TREATMENTS ?? []),
  ...BETA_DEMO_TREATMENTS,
];
