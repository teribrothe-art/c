import {
  buildAccumulatedSeedProfile,
  type AccumulatedSeedProfileStats,
} from './demo-accumulated-seed-builder';
import { ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';

export type { AccumulatedDemoTreatment } from './demo-accumulated-seed-builder';
export type { AccumulatedSeedProfileStats };

const builtProfiles = ACCUMULATED_TEST_PROFILE_CONFIGS.map((config) =>
  buildAccumulatedSeedProfile(config),
);

export const ACCUMULATED_TEST_PROFILES = builtProfiles;

export const ACCUMULATED_DEMO_TREATMENTS = builtProfiles.flatMap((profile) => profile.treatments);
export const ACCUMULATED_DEMO_PAYMENTS = builtProfiles.flatMap((profile) => profile.payments);

export const ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE = Object.fromEntries(
  builtProfiles.map((profile) => [profile.key, profile.stats]),
) as Record<string, AccumulatedSeedProfileStats>;

/** @deprecated ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE['2y'] 사용 */
export const ACCUMULATED_DEMO_SEED_STATS = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE['2y'];
