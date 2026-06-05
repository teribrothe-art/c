import { isSupabaseConfigured, supabase } from './supabase';

/** 데모·로컬 테스트 모드 (auth.ts import 없이 사용) */
export const isDemoAuthMode = !isSupabaseConfigured || !supabase;
