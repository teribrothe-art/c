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

/** Expo Go / Metro 접속 주소 (공유·QR용) — app.json 버전과 manifest가 일치할 때 우선 */
export function getExpoConnectShareUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_DEV_CONNECT_URL?.trim();

  if (fromEnv) {
    return fromEnv;
  }

  const fromManifest = getManifestConnectUrl();

  if (fromManifest) {
    return fromManifest;
  }

  return getRuntimeConnectUrl();
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
    'Expo Go → Enter URL manually 에 붙여넣거나 QR을 스캔하세요.',
    'PC에서 Metro는 npm run start:phone 실행 중이어야 합니다.',
  ].join('\n');
}
