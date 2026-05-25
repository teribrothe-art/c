import { chatWithClaudeDetailed, getUserContext, saveAiConversation } from './ai';
import { listAiConversations } from './ai-conversations';
import { getCurrentUser } from './auth';
import { checkConsultationUsage } from './ai-usage';
import { isAiChatEnabled } from './ai-edge';

/** 텍스트 AI 상담 — getUserContext → chatWithClaude → ai_conversations 저장 */
export async function processTextConsultation(userMessage: string) {
  const usage = await checkConsultationUsage();

  if (!usage.allowed) {
    throw new Error(usage.message);
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const trimmed = userMessage.trim();

  if (!trimmed) {
    throw new Error('메시지를 입력해주세요.');
  }

  const userContext = await getUserContext(user.id);
  const recent = await listAiConversations(6);
  const conversationHistory = recent
    .slice()
    .reverse()
    .flatMap((item) => [
      { user_message: item.user_message, ai_response: item.ai_response },
    ]);

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
      source: 'text',
      provider,
      model,
    },
  });
}

export { isAiChatEnabled };
