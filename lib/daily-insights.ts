import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { buildInsightPayload, getDamageAccentColor, getDamageHeadline, getTimeOfDayGreeting } from './insight-content';
import { getProfileScreenData } from './profile';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { getTreatments, Treatment } from './treatments';

const DEMO_STORAGE_KEY = 'hair-diary-daily-insights';

export type DailyInsight = {
  id: string;
  user_id: string;
  insight_date: string;
  insight_type: string;
  insight_message: string;
  damage_level: number | null;
  recommendation: string | null;
  viewed_at: string | null;
  dismissed: boolean;
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
  message: string;
  latestTreatmentId: string | null;
  insightType: string;
  recommendation: string | null;
  insightId?: string;
};

const selectFields =
  'id, user_id, insight_date, insight_type, insight_message, damage_level, recommendation, viewed_at, dismissed';

const memoryStore: DailyInsight[] = [];

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
    insight_type: payload.insightType,
    insight_message: payload.insightMessage,
    damage_level: payload.damageLevel,
    recommendation: payload.recommendation,
    viewed_at: new Date().toISOString(),
    dismissed: false,
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

function toDailyCareSnapshot(insight: DailyInsight, treatments: Treatment[]): DailyCareSnapshot | null {
  if (insight.dismissed) {
    return null;
  }

  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const firstLine = insight.insight_message.split('\n')[0] ?? insight.insight_message;

  return {
    insightId: insight.id,
    damageLevel: insight.damage_level,
    message: firstLine,
    latestTreatmentId: sorted[0]?.id ?? null,
    insightType: insight.insight_type,
    recommendation: insight.recommendation,
  };
}

function toInsightScreenData(insight: DailyInsight, userName: string): DailyInsightScreenData {
  return {
    insightId: insight.id,
    userName,
    timeGreeting: getTimeOfDayGreeting(),
    damageLevel: insight.damage_level,
    damageScoreLabel:
      typeof insight.damage_level === 'number' ? `손상도 ${insight.damage_level}/10` : '손상도 기록 없음',
    damageHeadline: getDamageHeadline(insight.damage_level),
    insightMessage: insight.insight_message,
    recommendation: insight.recommendation,
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
  const existing = await findTodayInsightRecord(user.id, insightDate);

  if (existing?.dismissed) {
    return '/home';
  }

  const { treatments } = await getTreatments();

  if (!existing) {
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
  let insight = await findTodayInsightRecord(user.id, insightDate);

  if (!insight) {
    const { treatments } = await getTreatments();
    insight = await upsertTodayInsight(user.id, insightDate, treatments);
  }

  if (insight.dismissed) {
    return null;
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
  const existing = await findTodayInsightRecord(user.id, insightDate);

  if (existing?.dismissed) {
    return null;
  }

  let insight = existing;

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

export async function dismissTodayDailyInsight(insightId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    const index = items.findIndex((item) => item.id === insightId && item.user_id === user.id);

    if (index >= 0) {
      items[index] = { ...items[index], dismissed: true };
      await writeDemoStore(items);
    }

    return;
  }

  const { error } = await supabase
    .from('daily_insights')
    .update({ dismissed: true })
    .eq('id', insightId)
    .eq('user_id', user.id);

  if (error) {
    throw toAppError(error);
  }
}
