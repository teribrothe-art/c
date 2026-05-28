import Constants from 'expo-constants';

import appConfig from '../app.json';

/** app.json semver */
export const APP_VERSION = appConfig.expo.version;

/** 빌드 식별(어제 12시 스냅샷 등) — app.json extra.buildLabel */
export const APP_BUILD_LABEL =
  (Constants.expoConfig?.extra?.buildLabel as string | undefined)?.trim() ||
  process.env.EXPO_PUBLIC_APP_BUILD_LABEL?.trim() ||
  '2026-05-27 12:00';

export function formatAppVersionLine() {
  return `v${APP_VERSION} · ${APP_BUILD_LABEL}`;
}

export function formatAppVersionShort() {
  return `v${APP_VERSION}`;
}
