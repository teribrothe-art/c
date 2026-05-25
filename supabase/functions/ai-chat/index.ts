// @ts-nocheck — Deno Edge Runtime (앱 TypeScript 빌드에서 제외)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `당신은 헤어 케어 AI 어시스턴트입니다.
사용자의 시술 이력을 참고해서 개인화된 답변을 제공하세요.
답변은 친근하고 전문적이게, 한국어로 2~3문장 이내로 짧게 작성하세요.
손상도, 시술 주기, 홈케어, 디자이너 소견 등 구체적 조언을 포함하세요.
의료 진단이 아닌 일반적인 헤어 케어 조언 수준으로 답하세요.
절대 사용자에게 약품 브랜드명이나 약품 정보, 가격을 노출하지 마세요.
필요시 '디자이너가 사용한 전문 약품으로...' 같이 일반화해서 표현하세요.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse({ error: '로그인이 필요합니다.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase 환경 변수가 설정되지 않았습니다.' }, 500);
  }

  if (!anthropicApiKey) {
    return jsonResponse(
      { error: 'AI 서버에 API 키가 없습니다. Supabase Secrets에 ANTHROPIC_API_KEY를 등록해주세요.' },
      503,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: '인증에 실패했습니다.' }, 401);
  }

  let payload: {
    userMessage?: string;
    userContext?: unknown;
    conversationHistory?: { user_message?: string; ai_response?: string }[];
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const userMessage = payload.userMessage?.trim() ?? '';

  if (!userMessage) {
    return jsonResponse({ error: '메시지를 입력해주세요.' }, 400);
  }

  const contextJson = JSON.stringify(payload.userContext ?? {}, null, 0);
  const history = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory
        .filter((turn) => turn.user_message?.trim() && turn.ai_response?.trim())
        .slice(-8)
    : [];

  const messages = [];

  for (const turn of history) {
    messages.push({ role: 'user', content: turn.user_message.trim() });
    messages.push({ role: 'assistant', content: turn.ai_response.trim() });
  }

  messages.push({
    role: 'user',
    content:
      history.length === 0
        ? `시술 이력 컨텍스트:\n${contextJson}\n\n고객 질문:\n${userMessage}`
        : `시술 이력 컨텍스트(참고):\n${contextJson}\n\n고객 질문:\n${userMessage}`,
  });

  try {
    const anthropicResponse = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const anthropicBody = (await anthropicResponse.json()) as {
      content?: { type: string; text?: string }[];
      error?: { message?: string };
    };

    if (!anthropicResponse.ok) {
      const status = anthropicResponse.status;
      const message = anthropicBody.error?.message ?? 'AI 응답에 실패했습니다.';

      if (status === 401 || status === 403) {
        return jsonResponse({ error: 'AI API 키를 확인해주세요.' }, 502);
      }

      if (status === 429) {
        return jsonResponse({ error: '오늘의 상담 한도가 다 됐어요' }, 429);
      }

      return jsonResponse({ error: message }, status >= 500 ? 502 : status);
    }

    const text = anthropicBody.content?.find((block) => block.type === 'text')?.text?.trim();

    if (!text) {
      return jsonResponse({ error: '잠시 후 다시 시도해주세요' }, 502);
    }

    return jsonResponse({ text, model: CLAUDE_MODEL, provider: 'anthropic-edge' });
  } catch {
    return jsonResponse({ error: '인터넷 연결을 확인해주세요' }, 502);
  }
});
