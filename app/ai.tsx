import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert } from '../lib/alerts';
import {
  AiConversation,
  askAiWithContext,
  listAiConversations,
} from '../lib/ai-conversations';
import { getErrorMessage } from '../lib/errors';
import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { EmptyState } from '../src/components/empty-state';

const PURPLE = '#7B5EE6';
const CORAL = '#FF5A5F';

function formatTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 16);
}

function ChatBubble({ role, text }: { role: 'user' | 'ai'; text: string }) {
  const isUser = role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{text}</Text>
      </View>
    </View>
  );
}

export default function AiConsultScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadHistory = useCallback(() => {
    setIsLoading(true);

    listAiConversations()
      .then((items) => {
        setConversations(items.reverse());
      })
      .catch((error) => {
        showErrorAlert(getErrorMessage(error, '대화 기록을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const handleSend = async () => {
    const trimmed = message.trim();

    if (!trimmed || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setMessage('');

      const saved = await askAiWithContext(trimmed);
      setConversations((prev) => [...prev, saved]);
    } catch (error) {
      showErrorAlert(getErrorMessage(error, 'AI 응답에 실패했습니다.'));
      setMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>AI 상담</Text>
        <Text style={styles.subtitle}>시술 이력 기반 맞춤 조언 (베타)</Text>
      </View>

      <ScrollView
        style={styles.chatList}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={PURPLE} style={styles.loader} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="🎤"
            title="AI에게 물어보세요"
            subtitle="예: 다음 시술은 언제가 좋을까요? / 손상 케어 방법 알려줘"
          />
        ) : (
          conversations.flatMap((item) => [
            <ChatBubble key={`${item.id}-u`} role="user" text={item.user_message} />,
            <ChatBubble key={`${item.id}-a`} role="ai" text={item.ai_response} />,
            <Text key={`${item.id}-t`} style={styles.time}>
              {formatTime(item.created_at)}
            </Text>,
          ])
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 72 }]}>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!isSending}
        />
        <Pressable
          style={[styles.sendButton, isSending && styles.sendDisabled]}
          onPress={handleSend}
          disabled={isSending}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendText}>전송</Text>
          )}
        </Pressable>
      </View>

      <BottomTabBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: '#1A1A2E', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#6B6B7B', fontSize: 13, fontWeight: '600', marginTop: 4 },
  chatList: { flex: 1 },
  chatContent: { gap: 10, padding: 16, paddingBottom: 8 },
  loader: { marginTop: 40 },
  bubbleRow: { alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 16,
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { backgroundColor: CORAL },
  bubbleAi: { backgroundColor: '#FFFFFF', borderColor: '#E8E8F0', borderWidth: 1 },
  bubbleText: { color: '#1A1A2E', fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF' },
  time: { alignSelf: 'center', color: '#9CA3AF', fontSize: 11, marginVertical: 4 },
  inputBar: {
    borderTopColor: '#E8E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: 14,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: 12,
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
