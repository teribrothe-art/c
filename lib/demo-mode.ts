import { DEMO_SESSION_KEY, demoPersistedStorage } from './demo-persisted-storage';
import { isSupabaseConfigured, supabase } from './supabase';

/** Supabase가 설정돼 있어도 웹·폰에서 로컬 데모를 쓰려면 `.env`에 `true` */
export const isForceDemoMode =
  process.env.EXPO_PUBLIC_FORCE_DEMO_MODE === 'true' ||
  process.env.EXPO_PUBLIC_FORCE_DEMO_MODE === '1';

/** 로컬·테스트 계정 인증 (웹·Expo Go·네이티브 공통) */
export const isDemoAuthMode = isForceDemoMode || !isSupabaseConfigured || !supabase;

/** 시술·결제 등 로컬 데모 DB 사용 여부 (데모 로그인 세션이 있으면 true) */
export async function shouldUseLocalDemoStore() {
  if (isDemoAuthMode) {
    return true;
  }

  return Boolean(await demoPersistedStorage.getItem(DEMO_SESSION_KEY));
}
