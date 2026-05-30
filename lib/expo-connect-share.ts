import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go / Metro 접속 주소 (공유·복사용) */
export function getExpoConnectShareUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_DEV_CONNECT_URL?.trim();

  if (fromEnv) {
    return fromEnv;
  }

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
