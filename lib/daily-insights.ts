import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';

import { getCurrentUser, isDemoAuthMode } from './auth';
import {
  buildInsightPayload,
  extractRecommendationFromMessage,
  getDamageAccentColor,
  getTimeOfDayGreeting,
} from './insight-content';
import { getProfileScreenData } from './profile';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { getTreatments, Treatment } from './treatments';

const DEMO_STORAGE_KEY = 'hair-diary-daily-insights';
const DISMISS_PREFIX = 'hair-diary-insight-dismissed';

export type DailyInsight = {
  id: string;
  user_id: string;
  insight_date: string;
  damage_level: number | null;
  headline: string;
  message: string;
  viewed_at: string | null;
};

export type DailyInsightScreenData = {
  insightId: string;
  userName: string;
  timeGreeting: string;
  damageLevel: number | null;
  damageScoreLabel: string;
  damageHeadline: string;
  insightMessage: string;
  recommendation: string | null;
  accentColor: string;
};

export type DailyCareSnapshot = {
  damageLevel: number | null;
  headline: string;
  message: string;
  latestTreatmentId: string | null;
  recommendation: string | null;
  insightId?: string;
};

const selectFields =
  'id, user_id, insight_date, damage_level, headline, message, viewed_at';

const memoryStore: DailyInsight[] = [];

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dismissStorageKey(userId: string, insightDate: string) {
  return `${DISMISS_PREFIX}-${userId}-${insightDate}`;
}

export async function isTodayInsightDismissed(userId: string, insightDate = toLocalDateString()) {
  const value = await AsyncStorage.getItem(dismissStorageKey(userId, insightDate));
  return value === '1';
}

export async function markTodayInsightDismissed(userId: string, insightDate = toLocalDateString()) {
  await AsyncStorage.setItem(dismissStorageKey(userId, insightDate), '1');
}

async function readDemoStore(): Promise<DailyInsight[]> {
  const raw = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as DailyInsight[]) : [...memoryStore];
}

async function writeDemoStore(items: DailyInsight[]) {
  memoryStore.length = 0;
  memoryStore.push(...items);
  await AsyncStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items));
}

export async function findTodayInsightRecord(userId: string, insightDate: string) {
  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    return items.find((item) => item.user_id === userId && item.insight_date === insightDate) ?? null;
  }

  const { data, error } = await supabase
    .from('daily_insights')
    .select(selectFields)
    .eq('user_id', userId)
    .eq('insight_date', insightDate)
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  return (data as DailyInsight | null) ?? null;
}

async function upsertTodayInsight(userId: string, insightDate: string, treatments: Treatment[]) {
  const payload = buildInsightPayload(treatments);

  const recordPayload = {
    user_id: userId,
    insight_date: insightDate,
    damage_level: payload.damageLevel,
    headline: payload.headline,
    message: payload.message,
    viewed_at: new Date().toISOString(),
  };

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    const existingIndex = items.findIndex(
      (item) => item.user_id === userId && item.insight_date === insightDate,
    );
    const record: DailyInsight = {
      id: existingIndex >= 0 ? items[existingIndex].id : `demo-insight-${insightDate}`,
      ...recordPayload,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = record;
    } else {
      items.unshift(record);
    }

    await writeDemoStore(items.slice(0, 120));
    return record;
  }

  const { data, error } = await supabase
    .from('daily_insights')
    .upsert(recordPayload, { onConflict: 'user_id,insight_date' })
    .select(selectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as DailyInsight;
}

async function touchViewed(insight: DailyInsight) {
  const viewedAt = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    const index = items.findIndex((item) => item.id === insight.id);

    if (index >= 0) {
      items[index] = { ...items[index], viewed_at: viewedAt };
      await writeDemoStore(items);
    }

    return;
  }

  await supabase.from('daily_insights').update({ viewed_at: viewedAt }).eq('id', insight.id);
}

function toDailyCareSnapshot(insight: DailyInsight, treatments: Treatment[]): DailyCareSnapshot {
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const firstLine = insight.message.split('\n')[0] ?? insight.message;

  return {
    insightId: insight.id,
    damageLevel: insight.damage_level,
    headline: insight.headline,
    message: firstLine,
    latestTreatmentId: sorted[0]?.id ?? null,
    recommendation: extractRecommendationFromMessage(insight.message),
  };
}

function toInsightScreenData(insight: DailyInsight, userName: string): DailyInsightScreenData {
  return {
    insightId: insight.id,
    userName,
    timeGreeting: getTimeOfDayGreeting(),
    damageLevel: insight.damage_level,
    damageScoreLabel:
      typeof insight.damage_level === 'number'
        ? `손상도 ${insight.damage_level}/10`
        : '손상도 기록 없음',
    damageHeadline: insight.headline,
    insightMessage: insight.message,
    recommendation: extractRecommendationFromMessage(insight.message),
    accentColor: getDamageAccentColor(insight.damage_level),
  };
}

/** 로그인 후 고객 이동 경로: /insight 또는 /home */
export async function resolveCustomerPostLoginRoute(): Promise<Href> {
  const user = await getCurrentUser();

  if (!user) {
    return '/';
  }

  const insightDate = toLocalDateString();

  if (await isTodayInsightDismissed(user.id, insightDate)) {
    return '/home';
  }

  const existing = await findTodayInsightRecord(user.id, insightDate);

  if (!existing) {
    const { treatments } = await getTreatments();
    await upsertTodayInsight(user.id, insightDate, treatments);
    return '/insight';
  }

  return '/insight';
}

export async function loadInsightScreenData(): Promise<DailyInsightScreenData | null> {
  const user = await getCurrentUser();

  if (!user || user.role === 'designer') {
    return null;
  }

  const insightDate = toLocalDateString();

  if (await isTodayInsightDismissed(user.id, insightDate)) {
    return null;
  }

  let insight = await findTodayInsightRecord(user.id, insightDate);

  if (!insight) {
    const { treatments } = await getTreatments();
    insight = await upsertTodayInsight(user.id, insightDate, treatments);
  }

  await touchViewed(insight);

  const profile = await getProfileScreenData();
  const userName = profile?.profile.name?.trim() || '고객';

  return toInsightScreenData(insight, userName);
}

export async function getTodayDailyCare(treatments: Treatment[]): Promise<DailyCareSnapshot | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const insightDate = toLocalDateString();

  if (await isTodayInsightDismissed(user.id, insightDate)) {
    return null;
  }

  let insight = await findTodayInsightRecord(user.id, insightDate);

  if (!insight) {
    if (treatments.length === 0) {
      return null;
    }

    insight = await upsertTodayInsight(user.id, insightDate, treatments);
  } else {
    await touchViewed(insight);
  }

  return toDailyCareSnapshot(insight, treatments);
}

/** DB에 dismissed 컬럼 없음 — 기기 로컬에 오늘 숨김 저장 */
export async function dismissTodayDailyInsight(_insightId?: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  await markTodayInsightDismissed(user.id, toLocalDateString());
}
