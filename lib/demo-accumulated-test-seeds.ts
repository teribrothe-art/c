import {
  buildAccumulatedSeedProfile,
  type AccumulatedSeedProfileStats,
  type BuiltAccumulatedSeedProfile,
} from './demo-accumulated-seed-builder';
import { ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';

export type { AccumulatedDemoTreatment } from './demo-accumulated-seed-builder';
export type { AccumulatedSeedProfileStats, BuiltAccumulatedSeedProfile };

const builtProfilesCache = new Map<string, BuiltAccumulatedSeedProfile>();

/** 단일 프로필 시드 생성 (로그인 시 1명만 빌드 — 100명 증원 성능) */
export function ensureAccumulatedProfileBuilt(
  profileKey: string,
): BuiltAccumulatedSeedProfile | undefined {
  const cached = builtProfilesCache.get(profileKey);

  if (cached) {
    return cached;
  }

  const config = ACCUMULATED_TEST_PROFILE_CONFIGS.find((item) => item.key === profileKey);

  if (!config) {
    return undefined;
  }

  const built = buildAccumulatedSeedProfile(config);
  builtProfilesCache.set(profileKey, built);

  return built;
}

export function ensureAccumulatedProfileBuiltByDesignerId(
  designerId: string,
): BuiltAccumulatedSeedProfile | undefined {
  const config = ACCUMULATED_TEST_PROFILE_CONFIGS.find((item) => item.designer.id === designerId);

  if (!config) {
    return undefined;
  }

  return ensureAccumulatedProfileBuilt(config.key);
}

/** 누적 테스트 시드 — 요청된 프로필만 생성 */
export function getAccumulatedTestProfiles(): BuiltAccumulatedSeedProfile[] {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.map(
    (config) => ensureAccumulatedProfileBuilt(config.key)!,
  );
}

/** 메모리에 빌드된 누적 프로필 캐시 초기화 */
export function clearAccumulatedTestProfilesCache() {
  builtProfilesCache.clear();
}

export function getAccumulatedDemoTreatments() {
  return getAccumulatedTestProfiles().flatMap((profile) => profile.treatments);
}

export function getAccumulatedDemoPayments() {
  return getAccumulatedTestProfiles().flatMap((profile) => profile.payments);
}

export function getAccumulatedDemoSeedStatsByProfile() {
  return Object.fromEntries(
    getAccumulatedTestProfiles().map((profile) => [profile.key, profile.stats]),
  ) as Record<string, AccumulatedSeedProfileStats>;
}

/** @deprecated getAccumulatedTestProfiles() 사용 */
export const ACCUMULATED_TEST_PROFILES = new Proxy([] as BuiltAccumulatedSeedProfile[], {
  get(_target, prop) {
    const profiles = getAccumulatedTestProfiles();

    if (prop === 'length') {
      return profiles.length;
    }

    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return profiles[Number(prop)];
    }

    const value = Reflect.get(profiles, prop);

    return typeof value === 'function' ? value.bind(profiles) : value;
  },
});

/** @deprecated getAccumulatedDemoTreatments() 사용 */
export const ACCUMULATED_DEMO_TREATMENTS = new Proxy([] as ReturnType<typeof getAccumulatedDemoTreatments>, {
  get(_target, prop) {
    const treatments = getAccumulatedDemoTreatments();
    const value = Reflect.get(treatments, prop);

    return typeof value === 'function' ? value.bind(treatments) : value;
  },
});

/** @deprecated getAccumulatedDemoPayments() 사용 */
export const ACCUMULATED_DEMO_PAYMENTS = new Proxy([] as ReturnType<typeof getAccumulatedDemoPayments>, {
  get(_target, prop) {
    const payments = getAccumulatedDemoPayments();
    const value = Reflect.get(payments, prop);

    return typeof value === 'function' ? value.bind(payments) : value;
  },
});

/** @deprecated getAccumulatedDemoSeedStatsByProfile() 사용 */
export const ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE = new Proxy(
  {} as Record<string, AccumulatedSeedProfileStats>,
  {
    get(_target, prop) {
      return getAccumulatedDemoSeedStatsByProfile()[prop as string];
    },
    ownKeys() {
      return Reflect.ownKeys(getAccumulatedDemoSeedStatsByProfile());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const stats = getAccumulatedDemoSeedStatsByProfile();

      if (typeof prop === 'string' && prop in stats) {
        return {
          configurable: true,
          enumerable: true,
          value: stats[prop],
        };
      }

      return undefined;
    },
  },
);

/** @deprecated getAccumulatedDemoSeedStatsByProfile()['2y'] 사용 */
export const ACCUMULATED_DEMO_SEED_STATS = new Proxy({} as AccumulatedSeedProfileStats, {
  get(_target, prop) {
    return getAccumulatedDemoSeedStatsByProfile()['2y']?.[prop as keyof AccumulatedSeedProfileStats];
  },
});
