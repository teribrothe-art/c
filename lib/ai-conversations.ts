import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { getUserContext, saveAiConversation, UserAiContext } from './ai';
import { chatWithClaudeDetailed } from './ai';
import { isAiChatEnabled } from './ai-edge';
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
    treatment_date: treatment.treatment_date,
    treatment_type: treatment.treatment_type,
    treatment_title: treatment.treatment_title,
    damage_level: treatment.damage_level ?? null,
    duration: treatment.duration ?? null,
    designer_diagnosis: treatment.designer_diagnosis ?? null,
    home_care: treatment.home_care ?? null,
    ai_insight: treatment.ai_insight ?? null,
    designer_name: treatment.designer_name ?? null,
  }));

  return {
    treatment_count: treatments.length,
    recent_treatments: recent,
  };
}

/** @deprecated lib/ai.ts getUserContext + chatWithClaude 사용 */
export function generatePlaceholderAiResponse(userMessage: string, treatments: Treatment[]) {
  const context: UserAiContext = {
    user_id: 'demo',
    profile: { name: null, joined_at: null },
    recent_treatments: buildTreatmentContext(treatments).recent_treatments,
  };

  const lower = userMessage.toLowerCase();
  const latest = context.recent_treatments[0];

  if (!latest) {
    return '아직 등록된 시술 기록이 없어요. 시술 후 다이어리를 채우면 더 정확한 조언을 드릴 수 있어요.';
  }

  if (lower.includes('손상') || lower.includes('케어')) {
    return `최근 ${latest.treatment_type} 시술 기준 손상도는 ${latest.damage_level ?? '-'}/10이에요. ${latest.home_care || '주 2회 딥 케어와 열 차단을 권장해요.'}`;
  }

  return `${latest.treatment_title} 기록을 참고했어요. ${latest.designer_diagnosis || latest.ai_insight || '궁금한 점을 더 구체적으로 말씀해 주세요.'}`;
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

export async function askAiWithContext(userMessage: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const trimmed = userMessage.trim();

  if (!trimmed) {
    throw new Error('메시지를 입력해 주세요.');
  }

  const userContext = await getUserContext(user.id);
  const recent = await listAiConversations(6);
  const conversationHistory = recent
    .slice()
    .reverse()
    .map((item) => ({
      user_message: item.user_message,
      ai_response: item.ai_response,
    }));

  const { text: aiResponse, model, provider } = await chatWithClaudeDetailed(
    trimmed,
    userContext,
    user.id,
    conversationHistory,
  );

  return saveAiConversation({
    userId: user.id,
    userMessage: trimmed,
    aiResponse,
    contextUsed: {
      ...userContext,
      provider,
      model,
    },
  });
}

export { isAiChatEnabled };

export { saveAiConversation } from './ai';
