import { withRetry } from './payment-retry';
import { AI_NO_PRODUCT_INSTRUCTION } from './treatment-privacy';
import { Treatment } from './treatments';

export type AiProvider = 'openai' | 'anthropic' | 'placeholder';

const PLACEHOLDER_MARKERS = ['여기에', 'YOUR_', 'sk-여기', 'sk-ant-여기'];

function readEnv(key: string) {
  return process.env[key]?.trim() ?? '';
}

function isRealKey(value: string, prefix: string) {
  if (!value.startsWith(prefix)) {
    return false;
  }

  return !PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

export function getOpenAiApiKey() {
  return readEnv('EXPO_PUBLIC_OPENAI_API_KEY');
}

export function getAnthropicApiKey() {
  return readEnv('EXPO_PUBLIC_ANTHROPIC_API_KEY');
}

export function isOpenAiConfigured() {
  return isRealKey(getOpenAiApiKey(), 'sk-');
}

export function isAnthropicConfigured() {
  const key = getAnthropicApiKey();

  if (!key) {
    return false;
  }

  return (
    (key.startsWith('sk-ant-') || key.startsWith('sk-ant-api')) &&
    !PLACEHOLDER_MARKERS.some((marker) => key.includes(marker))
  );
}

export function getActiveAiProvider(): AiProvider {
  if (isOpenAiConfigured()) {
    return 'openai';
  }

  if (isAnthropicConfigured()) {
    return 'anthropic';
  }

  return 'placeholder';
}

export function getAiProviderLabel(provider: AiProvider = getActiveAiProvider()) {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic Claude';
    default:
      return '데모 응답';
  }
}

function buildSystemPrompt(treatments: Treatment[]) {
  const contextJson = JSON.stringify(
    treatments.slice(0, 8).map((t) => ({
      date: t.treatment_date,
      type: t.treatment_type,
      title: t.treatment_title,
      damage: t.damage_level,
      diagnosis: t.designer_diagnosis,
      home_care: t.home_care,
      insight: t.ai_insight,
    })),
    null,
    0,
  );

  return `당신은 헤어 다이어리 앱의 AI 헤어 케어 상담사입니다. 한국어로 답변하세요.
고객의 시술 이력 JSON을 참고해 실용적이고 짧은 조언을 제공합니다. 의료 진단이 아닌 일반 케어 조언 수준으로 답하세요.

${AI_NO_PRODUCT_INSTRUCTION}

시술 이력:
${contextJson}`;
}

async function callOpenAi(userMessage: string, treatments: Treatment[]) {
  const apiKey = getOpenAiApiKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 600,
      messages: [
        { role: 'system', content: buildSystemPrompt(treatments) },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI 오류 (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('OpenAI 응답이 비어 있습니다.');
  }

  return text;
}

async function callAnthropic(userMessage: string, treatments: Treatment[]) {
  const apiKey = getAnthropicApiKey();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 600,
      system: buildSystemPrompt(treatments),
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic 오류 (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = data.content?.find((block) => block.type === 'text')?.text?.trim();

  if (!text) {
    throw new Error('Anthropic 응답이 비어 있습니다.');
  }

  return text;
}

export async function generateAiResponse(userMessage: string, treatments: Treatment[]) {
  const provider = getActiveAiProvider();

  if (provider === 'placeholder') {
    const { generatePlaceholderAiResponse } = await import('./ai-conversations');
    return generatePlaceholderAiResponse(userMessage, treatments);
  }

  return withRetry(
    async () => {
      if (provider === 'openai') {
        return callOpenAi(userMessage, treatments);
      }

      return callAnthropic(userMessage, treatments);
    },
    { maxAttempts: 2, delayMs: 1200 },
  );
}
