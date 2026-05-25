import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { buildDailyCareContent, DailyCareSnapshot, DailyInsightType } from './daily-care';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { Treatment } from './treatments';

const DEMO_STORAGE_KEY = 'hair-diary-daily-insights';

export type DailyInsight = {
  id: string;
  user_id: string;
  insight_date: string;
  insight_type: DailyInsightType | string;
  insight_message: string;
  damage_level: number | null;
  recommendation: string | null;
  viewed_at: string | null;
  dismissed: boolean;
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

function toDailyCareSnapshot(
  insight: DailyInsight,
  latestTreatmentId: string | null,
): DailyCareSnapshot {
  return {
    insightId: insight.id,
    damageLevel: insight.damage_level,
    message: insight.insight_message,
    latestTreatmentId,
    insightType: insight.insight_type as DailyInsightType,
    recommendation: insight.recommendation,
  };
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

async function findTodayInsightRecord(userId: string, insightDate: string) {
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

async function upsertTodayInsight(
  userId: string,
  insightDate: string,
  content: ReturnType<typeof buildDailyCareContent>,
) {
  const payload = {
    user_id: userId,
    insight_date: insightDate,
    insight_type: content.insightType,
    insight_message: content.message,
    damage_level: content.damageLevel,
    recommendation: content.recommendation,
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
      ...payload,
      viewed_at: payload.viewed_at,
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
    .upsert(payload, { onConflict: 'user_id,insight_date' })
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

/**
 * 오늘 인사이트 1건 조회. 없으면 시술 기록 기준으로 생성·저장.
 * dismissed=true 인 날은 null (카드 숨김).
 */
export async function getTodayDailyCare(treatments: Treatment[]): Promise<DailyCareSnapshot | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (treatments.length === 0) {
    return null;
  }

  const insightDate = toLocalDateString();
  const latestTreatmentId =
    [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))[0]?.id ??
    null;

  const existing = await findTodayInsightRecord(user.id, insightDate);

  if (existing?.dismissed) {
    return null;
  }

  let insight = existing;

  if (!insight) {
    const content = buildDailyCareContent(treatments);
    insight = await upsertTodayInsight(user.id, insightDate, content);
  } else {
    await touchViewed(insight);
  }

  return toDailyCareSnapshot(insight, latestTreatmentId);
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
