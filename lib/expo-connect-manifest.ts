import connectManifestRaw from '../expo-connect-manifest.json';

import { APP_BUILD_LABEL, APP_VERSION } from './app-version';

export type ExpoConnectManifest = {
  version: string;
  buildLabel?: string | null;
  url?: string | null;
  updatedAt?: string | null;
  mode?: string | null;
  shareable?: boolean | null;
  ngrokPublicUrl?: string | null;
  previousVersion?: string | null;
};

export function readExpoConnectManifest(): ExpoConnectManifest {
  return connectManifestRaw as ExpoConnectManifest;
}

/** 현재 앱 버전과 일치하는 manifest URL만 사용 */
export function getManifestConnectUrl(): string | null {
  const manifest = readExpoConnectManifest();
  const url = manifest.url?.trim();

  if (!url || manifest.version !== APP_VERSION) {
    return null;
  }

  return url;
}

/** 버전이 올라갔는데 share를 아직 안 한 상태 */
export function isConnectManifestPendingShare(): boolean {
  const manifest = readExpoConnectManifest();

  return manifest.version === APP_VERSION && !manifest.url?.trim();
}

/** manifest에 URL이 있지만 앱 버전과 불일치 (구버전 QR) */
export function isConnectManifestStale(): boolean {
  const manifest = readExpoConnectManifest();

  return Boolean(manifest.url?.trim() && manifest.version !== APP_VERSION);
}

export function formatConnectManifestVersionLine() {
  const manifest = readExpoConnectManifest();

  if (manifest.version === APP_VERSION && manifest.buildLabel) {
    return `v${APP_VERSION} · ${manifest.buildLabel}`;
  }

  if (manifest.version === APP_VERSION) {
    return `v${APP_VERSION}`;
  }

  return `v${APP_VERSION} · ${APP_BUILD_LABEL}`;
}
