import { INITIAL_DEMO_TREATMENTS } from './demo-initial-treatments';
import type { Treatment } from './treatments';

/** 기본 데모 시술만 (designer@hair.app · demo@hair.app 등) — 누적 테스트 1,000건은 별도 로드 */
export const ALL_DEMO_TREATMENT_SEEDS: Treatment[] = [
  ...(INITIAL_DEMO_TREATMENTS ?? []),
];
