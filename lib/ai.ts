import axios, { isAxiosError } from 'axios';

import { chatWithClaudeViaEdge, shouldUseAiEdgeProxy } from './ai-edge';
import { getCurrentUser, isDemoAuthMode } from './auth';
import {
  getAnthropicApiKey,
  isAnthropicConfigured,
  isClientKeyAiAllowed,
} from './ai-providers';
import { toAppError } from './errors';
import { AI_NO_PRODUCT_INSTRUCTION } from './treatment-privacy';
import { sanitizeTreatmentsForCustomer } from './treatment-privacy';
import { Treatment } from './treatments';
import { isSupabaseConfigured, supabase } from './supabase';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEMO_CONVERSATIONS_KEY = 'hair-diary-ai-conversations';

const SYSTEM_PROMPT = `당신은 헤어 케어 AI 어시스턴트입니다.
사용자의 시술 이력을 참고해서 개인화된 답변을 제공하세요.
답변은 친근하고 전문적이게, 한국어로 2~3문장 이내로 짧게 작성하세요.
손상도, 시술 주기, 홈케어, 디자이너 소견 등 구체적 조언을 포함하세요.
의료 진단이 아닌 일반적인 헤어 케어 조언 수준으로 답하세요.

${AI_NO_PRODUCT_INSTRUCTION}`;

export type UserAiTreatmentContext = {
  treatment_date: string;
  treatment_type: string;
  treatment_title: string;
  damage_level: number | null;
  duration: string | null;
  designer_diagnosis: string | null;
  home_care: string | null;
  ai_insight: string | null;
  designer_name: string | null;
};

export type UserAiContext = {
  user_id: string;
  profile: {
    name: string | null;
    joined_at: string | null;
  };
  recent_treatments: UserAiTreatmentContext[];
};

export type SavedAiConversation = {
  id: string;
  user_id: string;
  user_message: string;
  ai_response: string;
  audio_url: string | null;
  context_used: Record<string, unknown> | null;
  created_at: string;
};

export type ClaudeChatMeta = {
  model: string;
  provider: string;
};

const conversationSelect =
  'id, user_id, user_message, ai_response, audio_url, context_used, created_at';

function mapTreatmentToContext(treatment: Treatment): UserAiTreatmentContext {
  return {
    treatment_date: treatment.treatment_date,
    treatment_type: treatment.treatment_type,
    treatment_title: treatment.treatment_title,
    damage_level: treatment.damage_level ?? null,
    duration: treatment.duration ?? null,
    designer_diagnosis: treatment.designer_diagnosis ?? null,
    home_care: treatment.home_care ?? null,
    ai_insight: treatment.ai_insight ?? null,
    designer_name: treatment.designer_name ?? null,
  };
}

async function fetchRecentTreatmentsForUser(userId: string): Promise<Treatment[]> {
  const treatmentSelect =
    'id, customer_id, designer_id, designer_name, customer_name, treatment_date, treatment_type, treatment_title, technique, damage_level, notes, duration, designer_diagnosis, home_care, ai_insight, price, payment_status, feedback_completed, payment_requested_at, paid_at, settled_at, toss_order_id, toss_payment_key, platform_fee, designer_payout_amount, before_photo_url, after_photo_url, created_at';

  if (isDemoAuthMode || !supabase) {
    const { getTreatments } = await import('./treatments');
    const { treatments } = await getTreatments();

    return treatments
      .filter((item) => item.customer_id === userId)
      .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))
      .slice(0, 5);
  }

  const { data, error } = await supabase
    .from('treatments')
    .select(treatmentSelect)
    .eq('customer_id', userId)
    .order('treatment_date', { ascending: false })
    .limit(5);

  if (error) {
    throw toAppError(error);
  }

  return sanitizeTreatmentsForCustomer((data ?? []) as Treatment[]);
}

/** profiles + 최근 시술 5건 JSON (약품·가격 제외) */
export async function getUserContext(userId: string): Promise<UserAiContext> {
  let profile: UserAiContext['profile'] = {
    name: null,
    joined_at: null,
  };

  if (supabase && !isDemoAuthMode) {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw toAppError(error);
    }

    if (data) {
      profile = {
        name: data.name ?? null,
        joined_at: data.created_at ?? null,
      };
    }
  } else {
    const usersRaw = await (
      await import('@react-native-async-storage/async-storage')
    ).default.getItem('hair-diary-demo-users');
    const users = usersRaw ? (JSON.parse(usersRaw) as { id: string; name: string | null }[]) : [];
    const match = users.find((user) => user.id === userId);
    profile = {
      name: match?.name ?? null,
      joined_at: new Date().toISOString(),
    };
  }

  const treatments = await fetchRecentTreatmentsForUser(userId);

  return {
    user_id: userId,
    profile,
    recent_treatments: treatments.map(mapTreatmentToContext),
  };
}

function buildDemoAiResponse(userMessage: string, userContext: UserAiContext) {
  const latest = userContext.recent_treatments[0];

  if (!latest) {
    return '아직 등록된 시술 기록이 없어요. 시술 후 다이어리를 채우면 더 정확한 조언을 드릴 수 있어요.';
  }

  const lower = userMessage.toLowerCase();

  if (lower.includes('손상') || lower.includes('케어')) {
    return `최근 ${latest.treatment_type} 시술 기준 손상도는 ${latest.damage_level ?? '-'}/10이에요. ${latest.home_care || '주 2회 딥 케어와 열 차단을 권장해요.'}`;
  }

  if (lower.includes('다음') || lower.includes('언제')) {
    return `${latest.treatment_title} 이후에는 4~6주 간격으로 점검을 추천해요. ${latest.ai_insight || '다음 방문 전 수분 케어를 유지해 보세요.'}`;
  }

  return `${latest.treatment_title}(${latest.treatment_date}) 기록을 참고했어요. ${latest.designer_diagnosis || latest.ai_insight || '궁금한 점을 조금 더 구체적으로 말씀해 주시면 맞춤 조언을 드릴게요.'}`;
}

function parseClaudeError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const apiMessage =
      (error.response?.data as { error?: { message?: string } })?.error?.message ??
      error.message;

    if (status === 401 || status === 403) {
      return 'AI API 키를 확인해주세요.';
    }

    if (status === 429) {
      return '오늘의 상담 한도가 다 됐어요';
    }

    if (!error.response) {
      return '인터넷 연결을 확인해주세요';
    }

    return apiMessage || '잠시 후 다시 시도해주세요';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '잠시 후 다시 시도해주세요';
}

/** 로컬 개발 전용 — 앱에 키가 있을 때만 직접 Anthropic 호출 */
async function chatWithClaudeDirect(
  userMessage: string,
  userContext: UserAiContext | Record<string, unknown>,
): Promise<ClaudeChatMeta & { text: string }> {
  const apiKey = getAnthropicApiKey();
  const contextJson = JSON.stringify(userContext, null, 0);

  const { data } = await axios.post<{
    content?: { type: string; text?: string }[];
  }>(
    ANTHROPIC_MESSAGES_URL,
    {
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `시술 이력 컨텍스트:\n${contextJson}\n\n고객 질문:\n${userMessage}`,
        },
      ],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 60_000,
    },
  );

  const text = data.content?.find((block) => block.type === 'text')?.text?.trim();

  if (!text) {
    throw new Error('잠시 후 다시 시도해주세요');
  }

  return { text, model: CLAUDE_MODEL, provider: 'anthropic-client-dev' };
}

/**
 * Anthropic Claude — Supabase Edge 프록시 우선, 데모/미연동 시 로컬 응답
 */
export async function chatWithClaude(
  userMessage: string,
  userContext: UserAiContext | Record<string, unknown>,
  _userId: string,
): Promise<string> {
  const trimmedMessage = userMessage.trim();

  if (!trimmedMessage) {
    throw new Error('메시지를 입력해주세요.');
  }

  const context = userContext as UserAiContext;

  if (isDemoAuthMode || !isSupabaseConfigured) {
    return buildDemoAiResponse(trimmedMessage, context);
  }

  if (shouldUseAiEdgeProxy()) {
    const edge = await chatWithClaudeViaEdge(trimmedMessage, userContext as Record<string, unknown>);
    return edge.text;
  }

  if (isClientKeyAiAllowed() && isAnthropicConfigured()) {
    try {
      const direct = await chatWithClaudeDirect(trimmedMessage, userContext);
      return direct.text;
    } catch (directError) {
      throw new Error(parseClaudeError(directError));
    }
  }

  throw new Error(
    'AI 상담 서버가 준비되지 않았습니다. Supabase Edge Function(ai-chat)을 배포하거나 supabase/AI_EDGE.md를 참고해주세요.',
  );
}

/** chatWithClaude 메타데이터 (저장용) */
export async function chatWithClaudeDetailed(
  userMessage: string,
  userContext: UserAiContext | Record<string, unknown>,
  userId: string,
): Promise<ClaudeChatMeta & { text: string }> {
  const trimmedMessage = userMessage.trim();

  if (!trimmedMessage) {
    throw new Error('메시지를 입력해주세요.');
  }

  if (isDemoAuthMode || !isSupabaseConfigured) {
    return {
      text: buildDemoAiResponse(trimmedMessage, userContext as UserAiContext),
      model: 'demo',
      provider: 'demo',
    };
  }

  if (shouldUseAiEdgeProxy()) {
    return chatWithClaudeViaEdge(trimmedMessage, userContext as Record<string, unknown>);
  }

  if (isClientKeyAiAllowed() && isAnthropicConfigured()) {
    return chatWithClaudeDirect(trimmedMessage, userContext);
  }

  throw new Error(
    'AI 상담 서버가 준비되지 않았습니다. Supabase Edge Function(ai-chat)을 배포해주세요.',
  );
}

/** ai_conversations 저장 */
export async function saveAiConversation(input: {
  userId: string;
  userMessage: string;
  aiResponse: string;
  audioUrl?: string | null;
  contextUsed?: Record<string, unknown> | null;
}): Promise<SavedAiConversation> {
  const record = {
    user_id: input.userId,
    user_message: input.userMessage.trim(),
    ai_response: input.aiResponse.trim(),
    audio_url: input.audioUrl ?? null,
    context_used: input.contextUsed ?? null,
  };

  if (!record.user_message) {
    throw new Error('메시지를 입력해 주세요.');
  }

  if (!record.ai_response) {
    throw new Error('AI 응답이 비어 있습니다.');
  }

  if (isDemoAuthMode || !supabase) {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(DEMO_CONVERSATIONS_KEY);
    const items = raw ? (JSON.parse(raw) as SavedAiConversation[]) : [];
    const conversation: SavedAiConversation = {
      ...record,
      id: `demo-ai-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    items.unshift(conversation);
    await AsyncStorage.setItem(DEMO_CONVERSATIONS_KEY, JSON.stringify(items.slice(0, 100)));
    return conversation;
  }

  const user = await getCurrentUser();

  if (!user || user.id !== input.userId) {
    throw new Error('대화를 저장할 권한이 없습니다.');
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(record)
    .select(conversationSelect)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as SavedAiConversation;
}
