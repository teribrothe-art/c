import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { isDemoAuthMode } from './demo-auth-mode';

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function webGetItemSync(key: string): string | null | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSetItemSync(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
}

function webRemoveItemSync(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  }
}

/** 데모 모드 — 메모리·웹 localStorage 캐시로 반복 JSON 파싱·디스크 I/O 절감 */
export async function demoGetItem(key: string): Promise<string | null> {
  if (!isDemoAuthMode) {
    return AsyncStorage.getItem(key);
  }

  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const syncValue = webGetItemSync(key);

  if (syncValue !== undefined) {
    cache.set(key, syncValue);
    return syncValue;
  }

  const pending = inflight.get(key);

  if (pending) {
    return pending;
  }

  const promise = AsyncStorage.getItem(key).then((value) => {
    cache.set(key, value);
    inflight.delete(key);
    return value;
  });

  inflight.set(key, promise);
  return promise;
}

export async function demoSetItem(key: string, value: string): Promise<void> {
  if (isDemoAuthMode) {
    cache.set(key, value);
    webSetItemSync(key, value);
  }

  await AsyncStorage.setItem(key, value);
}

export async function demoRemoveItem(key: string): Promise<void> {
  if (isDemoAuthMode) {
    cache.set(key, null);
    webRemoveItemSync(key);
  }

  await AsyncStorage.removeItem(key);
}

export async function demoMultiSet(pairs: [string, string][]): Promise<void> {
  if (isDemoAuthMode) {
    for (const [key, value] of pairs) {
      cache.set(key, value);
      webSetItemSync(key, value);
    }
  }

  await AsyncStorage.multiSet(pairs);
}

export async function demoMultiRemove(keys: string[]): Promise<void> {
  if (isDemoAuthMode) {
    for (const key of keys) {
      cache.set(key, null);
      webRemoveItemSync(key);
    }
  }

  await AsyncStorage.multiRemove(keys);
}

/** 로그인·화면 진입 전 한 번에 워밍 — 테스트 앱 저장소 키 */
export const DEMO_WORKSPACE_STORAGE_KEYS = [
  'hair-diary-demo-treatments',
  'hair-diary-demo-payments',
  'hair-diary-customer-invitations',
  'hair-diary-designer-customer-relationships',
  'hair-diary-demo-users',
  'hair-diary-demo-session-user',
  'hair-diary-demo-session',
  'hair-diary-accumulated-treatment-patches',
  'hair-diary-notifications',
  'hair-diary-revenue-split-active',
  'hair-diary-revenue-split-pending',
] as const;

let prefetchPromise: Promise<void> | null = null;

export function prefetchDemoWorkspaceStorage(): Promise<void> {
  if (!isDemoAuthMode) {
    return Promise.resolve();
  }

  if (prefetchPromise) {
    return prefetchPromise;
  }

  prefetchPromise = (async () => {
    const keys = [...DEMO_WORKSPACE_STORAGE_KEYS];

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      for (const key of keys) {
        if (!cache.has(key)) {
          cache.set(key, webGetItemSync(key) ?? null);
        }
      }

      return;
    }

    const missing = keys.filter((key) => !cache.has(key));

    if (missing.length === 0) {
      return;
    }

    const pairs = await AsyncStorage.multiGet(missing);

    for (const [key, value] of pairs) {
      cache.set(key, value);
    }
  })();

  return prefetchPromise;
}
