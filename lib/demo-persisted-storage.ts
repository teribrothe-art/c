import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** 데모·로컬 데이터 — 웹은 localStorage, iOS/Android는 AsyncStorage */
export const demoPersistedStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }

    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    }

    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }

    return AsyncStorage.removeItem(key);
  },
};

export const DEMO_USERS_KEY = 'hair-diary-demo-users';
export const DEMO_SESSION_KEY = 'hair-diary-demo-session';
export const DEMO_TREATMENTS_KEY = 'hair-diary-demo-treatments';
export const DEMO_PAYMENTS_KEY = 'hair-diary-demo-payments';
