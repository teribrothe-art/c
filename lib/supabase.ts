import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { supabaseAuthStorage } from './supabase-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== '여기에_입력' &&
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
