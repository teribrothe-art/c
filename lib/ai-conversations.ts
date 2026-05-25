import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { getTreatments, Treatment } from './treatments';

const DEMO_STORAGE_KEY = 'hair-diary-ai-conversations';

export type AiConversation = {
  id: string;
  user_id: string;
  user_message: string;
  ai_response: string;
  audio_url: string | null;
  context_used: Record<string, unknown> | null;
  created_at: string;
};

const selectFields =
  'id, user_id, user_message, ai_response, audio_url, context_used, created_at';

const memoryStore: AiConversation[] = [];

async function readDemoStore(): Promise<AiConversation[]> {
  const raw = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AiConversation[]) : [...memoryStore];
}

async function writeDemoStore(items: AiConversation[]) {
  memoryStore.length = 0;
  memoryStore.push(...items);
  await AsyncStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items));
}

export function buildTreatmentContext(treatments: Treatment[]) {
  const recent = treatments.slice(0, 5).map((treatment) => ({
    id: treatment.id,
    date: treatment.treatment_date,
    type: treatment.treatment_type,
    title: treatment.treatment_title,
    damage: treatment.damage_level,
    insight: treatment.ai_insight,
  }));

  return {
    treatment_count: treatments.length,
    recent_treatments: recent,
  };
}

/** 데모/연동 전 플레이스홀더 응답 */
export function generatePlaceholderAiResponse(userMessage: string, treatments: Treatment[]) {
  const latest = treatments[0];

  if (!latest) {
    return '아직 등록된 시술 기록이 없어요. 시술 후 다이어리를 채우면 더 정확한 조언을 드릴 수 있어요.';
  }

  const lower = userMessage.toLowerCase();

  if (lower.includes('손상') || lower.includes('케어')) {
    return `최근 ${latest.treatment_type} 시술 기준 손상도는 ${latest.damage_level ?? '-'}/10이에요. ${latest.home_care || '주 2회 딥 케어와 열 차단을 권장해요.'}`;
  }

  if (lower.includes('다음') || lower.includes('언제')) {
    return `${latest.treatment_title} 이후에는 4~6주 간격으로 점검을 추천해요. ${latest.ai_insight || '다음 방문 전 모이스처 트리트먼트를 유지해 보세요.'}`;
  }

  return `${latest.treatment_title}(${latest.treatment_date}) 기록을 참고했어요. ${latest.designer_diagnosis || latest.ai_insight || '궁금한 점을 조금 더 구체적으로 말씀해 주시면 맞춤 조언을 드릴게요.'}`;
}

export async function listAiConversations(limit = 30) {
  const user = await getCurrentUser();

  if (!user) {
    return [] as AiConversation[];
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    return items
      .filter((item) => item.user_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .select(selectFields)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw toAppError(error);
  }

  return (data ?? []) as AiConversation[];
}

export async function saveAiConversation(input: {
  userMessage: string;
  aiResponse: string;
  audioUrl?: string | null;
  contextUsed?: Record<string, unknown> | null;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const record: Omit<AiConversation, 'id' | 'created_at'> = {
    user_id: user.id,
    user_message: input.userMessage.trim(),
    ai_response: input.aiResponse.trim(),
    audio_url: input.audioUrl ?? null,
    context_used: input.contextUsed ?? null,
  };

  if (!record.user_message) {
    throw new Error('메시지를 입력해 주세요.');
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoStore();
    const conversation: AiConversation = {
      ...record,
      id: `demo-ai-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    items.unshift(conversation);
    await writeDemoStore(items.slice(0, 100));
    return conversation;
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(record)
    .select(selectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as AiConversation;
}

export async function askAiWithContext(userMessage: string) {
  const { treatments } = await getTreatments();
  const contextUsed = buildTreatmentContext(treatments);
  const aiResponse = generatePlaceholderAiResponse(userMessage, treatments);

  return saveAiConversation({
    userMessage,
    aiResponse,
    contextUsed,
  });
}
