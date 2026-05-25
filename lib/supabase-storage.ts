import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** Supabase auth storage — 웹은 localStorage, 네이티브는 AsyncStorage */
export const supabaseAuthStorage = {
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
