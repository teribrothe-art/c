import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function webLocalStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

/** 데모·로컬 데이터 — 웹은 localStorage만 사용 (AsyncStorage와 혼용 시 세션 유실) */
export const demoPersistedStorage = {
  getItem: (key: string) => {
    const webStore = webLocalStorage();

    if (webStore) {
      return Promise.resolve(webStore.getItem(key));
    }

    if (Platform.OS === 'web') {
      return Promise.resolve(null);
    }

    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const webStore = webLocalStorage();

    if (webStore) {
      webStore.setItem(key, value);
      return Promise.resolve();
    }

    if (Platform.OS === 'web') {
      return Promise.resolve();
    }

    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    const webStore = webLocalStorage();

    if (webStore) {
      webStore.removeItem(key);
      return Promise.resolve();
    }

    if (Platform.OS === 'web') {
      return Promise.resolve();
    }

    return AsyncStorage.removeItem(key);
  },
};

export const DEMO_USERS_KEY = 'hair-diary-demo-users';
export const DEMO_SESSION_KEY = 'hair-diary-demo-session';
export const DEMO_TREATMENTS_KEY = 'hair-diary-demo-treatments';
export const DEMO_PAYMENTS_KEY = 'hair-diary-demo-payments';
