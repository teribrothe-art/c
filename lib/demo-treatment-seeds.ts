import { ACCUMULATED_DEMO_TREATMENTS } from './demo-accumulated-test-data';
import { INITIAL_DEMO_TREATMENTS } from './demo-initial-treatments';
import type { Treatment } from './treatments';

export const ALL_DEMO_TREATMENT_SEEDS: Treatment[] = [
  ...(INITIAL_DEMO_TREATMENTS ?? []),
  ...(ACCUMULATED_DEMO_TREATMENTS ?? []),
];
