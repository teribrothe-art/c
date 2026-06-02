import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  getManifestConnectUrl,
  isConnectManifestPendingShare,
  isConnectManifestStale,
  readExpoConnectManifest,
} from './expo-connect-manifest';

export type ExpoConnectShareStatus = {
  url: string | null;
  /** manifest URL이 현재 버전과 맞게 등록됨 */
  manifestSynced: boolean;
  /** 버전은 맞지만 npm run share 전 */
  pendingShare: boolean;
  /** 구버전 manifest URL 보유 */
  staleManifest: boolean;
  manifestVersion: string | null;
};

function getRuntimeConnectUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri?.trim();

  if (hostUri) {
    return hostUri;
  }

  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null | undefined;
  const debuggerHost = expoGo?.debuggerHost?.trim();

  if (debuggerHost) {
    return debuggerHost.includes('://') ? debuggerHost : `exp://${debuggerHost}`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return null;
}

/** Expo Go / Metro 접속 주소 — 실행 중 Metro 우선, manifest는 share 직후 세션만 유효 */
export function getExpoConnectShareUrl(): string | null {
  const fromRuntime = getRuntimeConnectUrl();

  if (fromRuntime) {
    return fromRuntime;
  }

  return getManifestConnectUrl();
}

export function getExpoConnectShareStatus(): ExpoConnectShareStatus {
  const manifest = readExpoConnectManifest();
  const url = getExpoConnectShareUrl();

  return {
    url,
    manifestSynced: Boolean(getManifestConnectUrl()),
    pendingShare: isConnectManifestPendingShare(),
    staleManifest: isConnectManifestStale(),
    manifestVersion: manifest.version ?? null,
  };
}

export function formatExpoConnectShareMessage(url: string) {
  return [
    '헤어 다이어리 — Expo Go 접속',
    '',
    url,
    '',
    'Expo Go 앱 → Enter URL manually 또는 QR 스캔',
    '※ 브라우저(HTTPS) 주소는 앱이 아닙니다. Metro 꺼지면 오프라인 오류가 납니다.',
    'PC에서 Metro: npm run start:connect → npm run share',
  ].join('\n');
}
