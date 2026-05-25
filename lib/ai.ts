import axios, { isAxiosError } from 'axios';
import { Platform } from 'react-native';

import { buildTreatmentContext, generatePlaceholderAiResponse } from './ai-conversations';
import { isDemoAuthMode } from './auth';
import { getAnthropicApiKey, getOpenAiApiKey, isAnthropicConfigured, isOpenAiConfigured } from './ai-providers';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { getTreatments } from './treatments';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const WHISPER_MODEL = 'whisper-1';

const SYSTEM_PROMPT = `당신은 헤어 케어 AI 어시스턴트입니다.
사용자의 시술 이력을 참고해서 개인화된 답변을 제공하세요.
답변은 친근하고 전문적이게, 한국어로 2-3문장 이내로 짧게.
손상도, 시술 주기, 홈케어 등 구체적 조언 포함.`;

export type UserAiContext = {
  user_id: string;
  profile: {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
  };
  treatment_count: number;
  recent_treatments: ReturnType<typeof buildTreatmentContext>['recent_treatments'];
};

function mapApiError(error: unknown, fallback: string): never {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const code = error.code;

    if (code === 'ECONNABORTED' || !error.response) {
      throw new Error('인터넷 연결 확인');
    }

    if (status === 429) {
      throw new Error('오늘의 상담 한도가 다 됐어요');
    }
  }

  const message = error instanceof Error ? error.message : '';

  if (message.includes('Network') || message.includes('fetch')) {
    throw new Error('인터넷 연결 확인');
  }

  throw new Error(fallback);
}

/** OpenAI Whisper — 음성을 한국어 텍스트로 변환 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('음성 상담은 iOS·Android 앱에서 이용할 수 있어요');
  }

  if (!isOpenAiConfigured()) {
    if (isDemoAuthMode) {
      return '요즘 머리가 푸석해요. 케어 방법 알려주세요.';
    }

    throw new Error('잠시 후 다시 시도해주세요');
  }

  const apiKey = getOpenAiApiKey();
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);
  formData.append('model', WHISPER_MODEL);
  formData.append('language', 'ko');

  try {
    const { data } = await axios.post<{ text?: string }>(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90_000,
      },
    );

    const text = data.text?.trim();

    if (!text) {
      throw new Error('잠시 후 다시 시도해주세요');
    }

    return text;
  } catch (error) {
    mapApiError(error, '잠시 후 다시 시도해주세요');
  }
}

/** profiles + 최근 시술 5건을 JSON 컨텍스트로 반환 */
export async function getUserContext(userId: string): Promise<UserAiContext> {
  const { treatments } = await getTreatments();
  const treatmentContext = buildTreatmentContext(treatments);

  let profile = {
    id: userId,
    email: null as string | null,
    name: null as string | null,
    role: null as string | null,
  };

  if (supabase && !isDemoAuthMode) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw toAppError(error);
    }

    if (data) {
      profile = {
        id: data.id,
        email: data.email ?? null,
        name: data.name,
        role: data.role,
      };
    }
  }

  return {
    user_id: userId,
    profile,
    treatment_count: treatmentContext.treatment_count,
    recent_treatments: treatmentContext.recent_treatments,
  };
}

/** Anthropic Claude — 개인화 답변 (2~3문장) */
export async function chatWithClaude(
  userMessage: string,
  userContext: UserAiContext | Record<string, unknown>,
): Promise<string> {
  const contextJson = JSON.stringify(userContext, null, 0);
  const trimmedMessage = userMessage.trim();

  if (!trimmedMessage) {
    throw new Error('더 길게 말해주세요');
  }

  if (!isAnthropicConfigured()) {
    const { treatments } = await getTreatments();
    return generatePlaceholderAiResponse(trimmedMessage, treatments);
  }

  const apiKey = getAnthropicApiKey();

  try {
    const { data } = await axios.post<{
      content?: { type: string; text?: string }[];
    }>(
      'https://api.anthropic.com/v1/messages',
      {
        model: CLAUDE_MODEL,
        max_tokens: 280,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `시술 이력 컨텍스트:\n${contextJson}\n\n고객 질문:\n${trimmedMessage}`,
          },
        ],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      },
    );

    const text = data.content?.find((block) => block.type === 'text')?.text?.trim();

    if (!text) {
      throw new Error('잠시 후 다시 시도해주세요');
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message === '더 길게 말해주세요') {
      throw error;
    }

    const { treatments } = await getTreatments();

    if (isAxiosError(error) && (error.response?.status === 429 || !error.response)) {
      if (error.response?.status === 429) {
        throw new Error('오늘의 상담 한도가 다 됐어요');
      }

      if (!error.response) {
        throw new Error('인터넷 연결 확인');
      }
    }

    return generatePlaceholderAiResponse(trimmedMessage, treatments);
  }
}
