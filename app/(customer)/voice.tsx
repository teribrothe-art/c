import { LinearGradient } from 'expo-linear-gradient';
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

import { showErrorAlert } from '../../lib/alerts';
import { AiConversation, listAiConversations } from '../../lib/ai-conversations';
import { processTextConsultation } from '../../lib/ai-voice';
import { getAiChatStatusLabel, isAiChatEnabled } from '../../lib/ai-edge';
import { getConsultationUsageSummary } from '../../lib/ai-usage';
import { colors } from '../../lib/theme';
import { getTreatments } from '../../lib/treatments';
import { getWeatherHairCareAdvice, type WeatherHairCareAdvice } from '../../lib/weather-hair-care';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';
import { EmptyState } from '../../src/components/empty-state';
import { WeatherHairCareCard } from '../../src/components/weather-hair-care-card';

const CORAL = colors.coral;
const PURPLE = colors.purple;
const DECO_SIZE = 100;

function formatTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso.replace('T', ' ').slice(0, 16);
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export default function CustomerVoiceScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [usageHint, setUsageHint] = useState('');
  const [weatherCare, setWeatherCare] = useState<WeatherHairCareAdvice | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const loadWeatherCare = useCallback(() => {
    setIsWeatherLoading(true);

    getTreatments()
      .then(({ treatments }) => getWeatherHairCareAdvice(treatments))
      .then(setWeatherCare)
      .catch(() => setWeatherCare(null))
      .finally(() => setIsWeatherLoading(false));
  }, []);

  const loadHistory = useCallback(() => {
    setIsLoading(true);

    Promise.all([listAiConversations(), getConsultationUsageSummary()])
      .then(([items, usage]) => {
        setConversations(items.reverse());

        if (usage.premium || usage.todayLimit >= 999) {
          setUsageHint('');
          return;
        }

        setUsageHint(
          `오늘 ${usage.todayCount}/${usage.todayLimit}회 · 이번 달 ${usage.monthCount}/${usage.monthLimit}회`,
        );
      })
      .catch(() => {
        showErrorAlert('대화 기록을 불러오지 못했습니다.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadWeatherCare();
    }, [loadHistory, loadWeatherCare]),
  );

  const handleSend = async () => {
    const trimmed = message.trim();

    if (!trimmed || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setMessage('');

      const saved = await processTextConsultation(trimmed);
      setConversations((prev) => [...prev, saved]);
      const usage = await getConsultationUsageSummary();

      if (!usage.premium && usage.todayLimit < 999) {
        setUsageHint(
          `오늘 ${usage.todayCount}/${usage.todayLimit}회 · 이번 달 ${usage.monthCount}/${usage.monthLimit}회`,
        );
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : '잠시 후 다시 시도해주세요';
      showErrorAlert(text);
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
      </View>

      <View style={styles.weatherSection}>
        <WeatherHairCareCard advice={weatherCare} isLoading={isWeatherLoading} />
      </View>

      <View style={styles.heroSection}>
        <LinearGradient
          colors={[CORAL, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.decoCircle}>
          <Text style={styles.decoIcon}>💬</Text>
        </LinearGradient>
        <Text style={styles.voiceHint}>{getAiChatStatusLabel()}</Text>
        <Text style={styles.featureHint}>
          시술 AI 인사이트·오늘의 케어·맞춤 상담이 Claude와 연동됩니다
        </Text>
        {!isAiChatEnabled() ? (
          <Text style={styles.setupHint}>
            Supabase 연결 + ai-chat 배포 또는 .env에 EXPO_PUBLIC_ANTHROPIC_API_KEY 설정 (미연동 시 데모·규칙 기반)
          </Text>
        ) : null}
        {usageHint ? <Text style={styles.usageHint}>{usageHint}</Text> : null}
      </View>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="고민을 적어주세요 (예: 머리가 푸석해)"
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!isSending}
          maxLength={500}
        />
        <Pressable
          onPress={() => void handleSend()}
          disabled={isSending}
          style={({ pressed }) => [
            styles.sendButton,
            isSending && styles.sendDisabled,
            pressed && { opacity: 0.7 },
          ]}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendText}>보내기</Text>
          )}
        </Pressable>
        {isSending ? <Text style={styles.analyzing}>분석 중...</Text> : null}
      </View>

      <ScrollView
        style={styles.chatList}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <ActivityIndicator color={PURPLE} style={styles.loader} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="💬"
            title="AI와 첫 대화를 시작해보세요"
            subtitle="시술 이력을 바탕으로 맞춤 케어 조언을 드려요"
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

      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <BottomTabBar />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  weatherSection: { paddingHorizontal: 16, paddingTop: 4 },
  heroSection: { alignItems: 'center', paddingVertical: 12 },
  decoCircle: {
    alignItems: 'center',
    borderRadius: DECO_SIZE / 2,
    height: DECO_SIZE,
    justifyContent: 'center',
    width: DECO_SIZE,
  },
  decoIcon: { fontSize: 40 },
  voiceHint: { color: colors.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  featureHint: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  setupHint: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  usageHint: { color: colors.purple, fontSize: 12, fontWeight: '600', marginTop: 4 },
  inputSection: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: CORAL,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
  },
  sendDisabled: { opacity: 0.65 },
  sendText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  analyzing: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  chatList: { flex: 1 },
  chatContent: { gap: 10, padding: 16, paddingBottom: 8 },
  loader: { marginTop: 16 },
  bubbleRow: { alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 16,
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { backgroundColor: CORAL },
  bubbleAi: { backgroundColor: '#F3F4F6' },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF' },
  time: { alignSelf: 'center', color: '#9CA3AF', fontSize: 11, marginVertical: 4 },
});
