import AsyncStorage from '@react-native-async-storage/async-storage';

import { listAiConversations } from './ai-conversations';
import { getCurrentUser } from './auth';

const PREMIUM_STORAGE_KEY = 'hair-diary-ai-premium';
export const FREE_DAILY_CONSULT_LIMIT = 3;
export const MONTHLY_API_CONSULT_LIMIT = 30;

function isSameLocalDay(iso: string, reference = new Date()) {
  const date = new Date(iso);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function isSameLocalMonth(iso: string, reference = new Date()) {
  const date = new Date(iso);

  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

export async function isPremiumUser() {
  const raw = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
  return raw === 'true';
}

/** 데모/테스트용 — 프로덕션에서는 profiles.is_premium 등으로 대체 */
export async function setPremiumUser(enabled: boolean) {
  await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, enabled ? 'true' : 'false');
}

export async function countConsultationsToday() {
  const user = await getCurrentUser();

  if (!user) {
    return 0;
  }

  const items = await listAiConversations(50);
  return items.filter((item) => isSameLocalDay(item.created_at)).length;
}

export async function countConsultationsThisMonth() {
  const user = await getCurrentUser();

  if (!user) {
    return 0;
  }

  const items = await listAiConversations(100);
  return items.filter((item) => isSameLocalMonth(item.created_at)).length;
}

export type UsageCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'daily_limit' | 'monthly_limit'; message: string };

export async function checkConsultationUsage(): Promise<UsageCheckResult> {
  const premium = await isPremiumUser();

  if (premium) {
    return { allowed: true };
  }

  const todayCount = await countConsultationsToday();

  if (todayCount >= FREE_DAILY_CONSULT_LIMIT) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: '프리미엄으로 업그레이드해주세요',
    };
  }

  const monthCount = await countConsultationsThisMonth();

  if (monthCount >= MONTHLY_API_CONSULT_LIMIT) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      message: '오늘의 상담 한도가 다 됐어요',
    };
  }

  return { allowed: true };
}
