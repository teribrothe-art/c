import {
  buildAccumulatedSeedProfile,
  type BuiltAccumulatedSeedProfile,
} from './demo-accumulated-seed-builder';
import {
  getNationwideDesignerConfig,
  isNationwideDesignerId,
  NATIONWIDE_DESIGNER_PROFILE_CONFIGS,
} from './nationwide-org-catalog';

const profileCache = new Map<string, BuiltAccumulatedSeedProfile>();

export function getNationwideProfileConfig(designerId: string) {
  return getNationwideDesignerConfig(designerId);
}

export function getOrBuildNationwideProfile(designerId: string): BuiltAccumulatedSeedProfile | null {
  const cached = profileCache.get(designerId);

  if (cached) {
    return cached;
  }

  const config = getNationwideDesignerConfig(designerId);

  if (!config) {
    return null;
  }

  const profile = buildAccumulatedSeedProfile(config);
  profileCache.set(designerId, profile);

  return profile;
}

export function findNationwideProfileByDesignerId(designerId: string) {
  if (!isNationwideDesignerId(designerId)) {
    return null;
  }

  return getOrBuildNationwideProfile(designerId);
}

export function clearNationwideProfileCache() {
  profileCache.clear();
}

export function getNationwideProfileConfigs() {
  return NATIONWIDE_DESIGNER_PROFILE_CONFIGS;
}

export { isNationwideDesignerId };
