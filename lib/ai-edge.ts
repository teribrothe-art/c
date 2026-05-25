import { FunctionsHttpError } from '@supabase/supabase-js';

import { canUseDirectAnthropicClient } from './ai-providers';
import { isSupabaseConfigured, supabase } from './supabase';

export type AiConversationTurn = {
  user_message: string;
  ai_response: string;
};

type EdgeChatSuccess = {
  text: string;
  model?: string;
  provider?: string;
};

type EdgeChatError = {
  error?: string;
};

async function readEdgeErrorMessage(error: FunctionsHttpError) {
  try {
    const context = await error.context.json();
    const body = context as EdgeChatError;

    if (body.error) {
      return body.error;
    }
  } catch {
    // fall through
  }

  return error.message || 'AI 상담 요청에 실패했습니다.';
}

export type AiEdgeTaskType = 'chat' | 'treatment_insight' | 'daily_care' | 'damage_level';

type AiEdgeInvokeOptions = {
  taskType?: AiEdgeTaskType;
};

/** Supabase Edge Function `ai-chat` — Anthropic 프록시 */
export async function chatWithClaudeViaEdge(
  userMessage: string,
  userContext: Record<string, unknown>,
  conversationHistory: AiConversationTurn[] = [],
  options: AiEdgeInvokeOptions = {},
): Promise<{ text: string; model: string; provider: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 연결되지 않았습니다.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data, error } = await supabase.functions.invoke<EdgeChatSuccess>('ai-chat', {
    body: {
      userMessage,
      userContext,
      conversationHistory,
      taskType: options.taskType ?? 'chat',
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new Error(await readEdgeErrorMessage(error));
    }

    throw new Error(error.message || 'AI 상담 요청에 실패했습니다.');
  }

  const text = data?.text?.trim();

  if (!text) {
    const edgeError = (data as EdgeChatError | null)?.error;

    throw new Error(edgeError || '잠시 후 다시 시도해주세요');
  }

  return {
    text,
    model: data?.model ?? 'claude-haiku-4-5',
    provider: data?.provider ?? 'anthropic-edge',
  };
}

export function shouldUseAiEdgeProxy() {
  return isSupabaseConfigured && Boolean(supabase);
}

/** 실제 Claude 연동 가능 여부 (상담·인사이트·오늘의 케어) */
export function isAiChatEnabled() {
  return shouldUseAiEdgeProxy() || canUseDirectAnthropicClient();
}

/** @deprecated isAiChatEnabled와 동일 */
export function isAiAppUtilizationEnabled() {
  return isAiChatEnabled();
}

export function getAiChatStatusLabel() {
  if (shouldUseAiEdgeProxy()) {
    return 'Claude AI · 시술 이력 기반 맞춤 상담 (보안 프록시)';
  }

  if (canUseDirectAnthropicClient()) {
    return 'Claude AI · 시술 이력 기반 맞춤 상담';
  }

  return 'AI 연동 대기 — Supabase Edge(ai-chat) 배포 또는 Anthropic API 키 설정';
}
