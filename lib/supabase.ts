import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { isPrivateOrNasEndpoint, warnIgnoredEndpoint } from './api/endpoint-policy';
import { supabaseAuthStorage } from './supabase-storage';

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const supabaseUrl =
  rawSupabaseUrl &&
  rawSupabaseUrl !== '여기에_입력' &&
  !isPrivateOrNasEndpoint(rawSupabaseUrl)
    ? rawSupabaseUrl
    : undefined;

if (rawSupabaseUrl && rawSupabaseUrl !== '여기에_입력' && isPrivateOrNasEndpoint(rawSupabaseUrl)) {
  warnIgnoredEndpoint('EXPO_PUBLIC_SUPABASE_URL', rawSupabaseUrl);
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseAnonKey !== '여기에_입력',
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: supabaseAuthStorage,
      },
    })
  : null;
