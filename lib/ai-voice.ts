import { saveAiConversation } from './ai-conversations';
import { chatWithClaude, getUserContext } from './ai';
import { getCurrentUser } from './auth';
import { checkConsultationUsage } from './ai-usage';

/** 텍스트 AI 상담 — getUserContext → chatWithClaude → DB 저장 */
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
  const aiResponse = await chatWithClaude(trimmed, userContext);

  return saveAiConversation({
    userMessage: trimmed,
    aiResponse,
    contextUsed: {
      ...userContext,
      source: 'text',
    },
  });
}
