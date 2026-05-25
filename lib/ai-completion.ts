import axios, { isAxiosError } from 'axios';

import { chatWithClaudeViaEdge, shouldUseAiEdgeProxy } from './ai-edge';
import type { AiConversationTurn } from './ai-edge';
import { isDemoAuthMode } from './auth';
import { canUseDirectAnthropicClient, getAnthropicApiKey } from './ai-providers';
import { AI_NO_PRODUCT_INSTRUCTION } from './treatment-privacy';
import { isSupabaseConfigured } from './supabase';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export type AiCompletionTask = 'treatment_insight' | 'daily_care' | 'damage_level';

const TASK_SYSTEM_PROMPTS: Record<AiCompletionTask, string> = {
  treatment_insight: `당신은 헤어 살롱 시술 기록용 AI입니다.
디자이너가 입력한 시술 데이터만 참고해, 고객 다이어리에 표시할 "AI 인사이트"를 작성하세요.
- 한국어 2문장 이내
- 다음 방문·주기와 홈케어 핵심만
- 의료 진단 금지, 친근·전문 톤
- 따옴표·제목·불릿 없이 본문만 출력

${AI_NO_PRODUCT_INSTRUCTION}`,
  damage_level: `당신은 헤어 살롱 모발 손상도 평가 AI입니다.
디자이너가 입력한 시술 데이터만 보고 모발 손상도를 1(매우 양호)~10(매우 손상) 정수로 평가하세요.
- 반드시 1~10 사이 정수 하나만 출력 (설명·문장·단위 금지)
- 의료 진단이 아닌 시술 기록 기반 추정
- 탈색·강한 펌·염색은 보통 높게, 컷·케어 위주는 낮게

${AI_NO_PRODUCT_INSTRUCTION}`,
  daily_care: `당신은 헤어 다이어리 "오늘의 케어" 카피라이터입니다.
고객의 최근 시술 이력을 참고해 오늘의 케어 메시지를 작성하세요.
- 한국어, 3~4줄 (줄바꿈 \\n 사용)
- 첫 줄: 최근 시술과 경과일 요약
- 이후: 손상도·홈케어에 맞는 실천 조언 1~2가지
- 마지막 줄은 반드시 "다음 시술 권장: (구체적 시기)" 형식
- 의료 진단 금지

${AI_NO_PRODUCT_INSTRUCTION}`,
};

export type AiCompletionResult = {
  text: string;
  model: string;
  provider: string;
};

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
      return 'AI 요청 한도에 도달했어요. 잠시 후 다시 시도해주세요.';
    }

    return apiMessage || '잠시 후 다시 시도해주세요';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '잠시 후 다시 시도해주세요';
}

async function completeViaDirectAnthropic(
  task: AiCompletionTask,
  userMessage: string,
  context: Record<string, unknown>,
): Promise<AiCompletionResult> {
  const apiKey = getAnthropicApiKey();
  const contextJson = JSON.stringify(context, null, 0);

  const { data } = await axios.post<{
    content?: { type: string; text?: string }[];
  }>(
    ANTHROPIC_MESSAGES_URL,
    {
      model: CLAUDE_MODEL,
      max_tokens:
        task === 'damage_level' ? 16 : task === 'treatment_insight' ? 220 : 400,
      system: TASK_SYSTEM_PROMPTS[task],
      messages: [
        {
          role: 'user',
          content: `참고 데이터:\n${contextJson}\n\n요청:\n${userMessage}`,
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

/** 단발성 AI 작업 — 시술 인사이트·오늘의 케어 등 */
export async function runAiCompletion(input: {
  task: AiCompletionTask;
  userMessage: string;
  context: Record<string, unknown>;
  conversationHistory?: AiConversationTurn[];
}): Promise<AiCompletionResult> {
  const userMessage = input.userMessage.trim();

  if (!userMessage) {
    throw new Error('요청 내용이 비어 있습니다.');
  }

  if (shouldUseAiEdgeProxy()) {
    try {
      const edge = await chatWithClaudeViaEdge(userMessage, input.context, input.conversationHistory ?? [], {
        taskType: input.task,
      });

      return edge;
    } catch (edgeError) {
      if (canUseDirectAnthropicClient()) {
        return completeViaDirectAnthropic(input.task, userMessage, input.context);
      }

      throw edgeError instanceof Error ? edgeError : new Error(String(edgeError));
    }
  }

  if (canUseDirectAnthropicClient()) {
    try {
      return completeViaDirectAnthropic(input.task, userMessage, input.context);
    } catch (directError) {
      throw new Error(parseClaudeError(directError));
    }
  }

  if (isDemoAuthMode || !isSupabaseConfigured) {
    throw new Error('AI_DEMO_ONLY');
  }

  throw new Error(
    'AI 기능을 사용하려면 Supabase Edge Function(ai-chat) 배포 또는 Anthropic API 키가 필요합니다.',
  );
}

export function isAiAppUtilizationEnabled() {
  return shouldUseAiEdgeProxy() || canUseDirectAnthropicClient();
}
