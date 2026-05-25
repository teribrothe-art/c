import AsyncStorage from '@react-native-async-storage/async-storage';

import { listAiConversations } from './ai-conversations';
import { getCurrentUser, isDemoAuthMode } from './auth';

const PREMIUM_STORAGE_KEY = 'hair-diary-ai-premium';
/** 무료 회원 하루 상담 횟수 (이전 3회 → 20회) */
export const FREE_DAILY_CONSULT_LIMIT = 20;
export const MONTHLY_API_CONSULT_LIMIT = 200;

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
  | { allowed: true; todayCount: number; todayLimit: number; monthCount: number; monthLimit: number }
  | {
      allowed: false;
      reason: 'daily_limit' | 'monthly_limit';
      message: string;
      todayCount: number;
      todayLimit: number;
      monthCount: number;
      monthLimit: number;
    };

export async function getConsultationUsageSummary() {
  const premium = await isPremiumUser();
  const todayCount = await countConsultationsToday();
  const monthCount = await countConsultationsThisMonth();
  const todayLimit = premium ? 999 : FREE_DAILY_CONSULT_LIMIT;
  const monthLimit = premium ? 9999 : MONTHLY_API_CONSULT_LIMIT;

  return {
    premium,
    todayCount,
    monthCount,
    todayLimit,
    monthLimit,
    todayRemaining: Math.max(0, todayLimit - todayCount),
  };
}

export async function checkConsultationUsage(): Promise<UsageCheckResult> {
  const summary = await getConsultationUsageSummary();

  if (isDemoAuthMode || summary.premium) {
    return {
      allowed: true,
      todayCount: summary.todayCount,
      todayLimit: summary.todayLimit,
      monthCount: summary.monthCount,
      monthLimit: summary.monthLimit,
    };
  }

  if (summary.todayCount >= summary.todayLimit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: `오늘 상담은 ${summary.todayLimit}회까지예요. 내일 다시 이용해주세요.`,
      todayCount: summary.todayCount,
      todayLimit: summary.todayLimit,
      monthCount: summary.monthCount,
      monthLimit: summary.monthLimit,
    };
  }

  if (summary.monthCount >= summary.monthLimit) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      message: `이번 달 상담 한도(${summary.monthLimit}회)를 모두 사용했어요.`,
      todayCount: summary.todayCount,
      todayLimit: summary.todayLimit,
      monthCount: summary.monthCount,
      monthLimit: summary.monthLimit,
    };
  }

  return {
    allowed: true,
    todayCount: summary.todayCount,
    todayLimit: summary.todayLimit,
    monthCount: summary.monthCount,
    monthLimit: summary.monthLimit,
  };
}
