import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert } from '../lib/alerts';
import { AiConversation, listAiConversations } from '../lib/ai-conversations';
import {
  countConsultationsToday,
  FREE_DAILY_CONSULT_LIMIT,
  isPremiumUser,
} from '../lib/ai-usage';
import {
  isVoiceRecordingActive,
  processVoiceConsultation,
  startVoiceRecording,
  stopVoiceRecording,
} from '../lib/ai-voice';
import { isOpenAiConfigured, isAnthropicConfigured } from '../lib/ai-providers';
import { colors } from '../lib/theme';
import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { EmptyState } from '../src/components/empty-state';

const CORAL = colors.coral;
const PURPLE = colors.purple;

type MicPhase = 'idle' | 'recording' | 'processing' | 'answering';

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

function MicGlyph() {
  return (
    <View style={styles.micIconWrap}>
      <View style={styles.micHead} />
      <View style={styles.micStem} />
      <View style={styles.micBase} />
    </View>
  );
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

function phaseHint(phase: MicPhase) {
  switch (phase) {
    case 'recording':
      return '듣고 있어요...';
    case 'processing':
      return '분석 중...';
    case 'answering':
      return '답변 생성 중...';
    default:
      return '터치해서 말하세요';
  }
}

export default function AiConsultScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [todayCount, setTodayCount] = useState(0);
  const [premium, setPremium] = useState(false);

  const [blink] = useState(() => new Animated.Value(1));
  const [pulse] = useState(() => new Animated.Value(1));
  const isBusy = phase !== 'idle';

  const loadHistory = useCallback(() => {
    setIsLoading(true);

    Promise.all([listAiConversations(), countConsultationsToday(), isPremiumUser()])
      .then(([items, count, isPrem]) => {
        setConversations(items.reverse());
        setTodayCount(count);
        setPremium(isPrem);
      })
      .catch(() => {
        showErrorAlert('대화 기록을 불러오지 못했습니다.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  useEffect(() => {
    if (phase !== 'recording') {
      blink.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 450, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [phase, blink]);

  useEffect(() => {
    if (phase !== 'answering') {
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [phase, pulse]);

  const finishRecording = useCallback(async () => {
    if (!isVoiceRecordingActive()) {
      return;
    }

    try {
      setPhase('processing');
      const { uri } = await stopVoiceRecording();
      setPhase('answering');

      const saved = await processVoiceConsultation(uri);
      setConversations((prev) => [...prev, saved]);
      setTodayCount((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : '잠시 후 다시 시도해주세요';
      showErrorAlert(message);
    } finally {
      setPhase('idle');
    }
  }, []);

  const handlePressIn = async () => {
    if (isBusy || Platform.OS === 'web') {
      if (Platform.OS === 'web') {
        showErrorAlert('음성 상담은 iOS·Android 앱에서 이용할 수 있어요');
      }

      return;
    }

    try {
      await startVoiceRecording(() => {
        void finishRecording();
      });
      setPhase('recording');
    } catch (error) {
      const message = error instanceof Error ? error.message : '마이크 권한이 필요해요';
      showErrorAlert(message);
      setPhase('idle');
    }
  };

  const handlePressOut = () => {
    if (phase === 'recording') {
      void finishRecording();
    }
  };

  const usageLabel = premium
    ? '프리미엄 · 무제한 상담'
    : `오늘 ${todayCount}/${FREE_DAILY_CONSULT_LIMIT}회 · Whisper ${isOpenAiConfigured() ? 'ON' : '데모'} · Claude ${isAnthropicConfigured() ? 'ON' : '데모'}`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>AI 상담</Text>
        <Text style={styles.subtitle}>{usageLabel}</Text>
      </View>

      <View style={styles.micSection}>
        <Text style={styles.hint}>{phaseHint(phase)}</Text>

        {phase === 'recording' ? (
          <View style={styles.recordingRow}>
            <Animated.View style={[styles.recDot, { opacity: blink }]} />
            <Text style={styles.recordingLabel}>녹음 중</Text>
          </View>
        ) : null}

        <Animated.View style={phase === 'answering' ? { transform: [{ scale: pulse }] } : undefined}>
          <Pressable
            onPressIn={() => void handlePressIn()}
            onPressOut={handlePressOut}
            disabled={isBusy && phase !== 'recording'}
            style={({ pressed }) => [styles.micPressable, pressed && phase === 'idle' && styles.micPressed]}>
            <LinearGradient
              colors={[CORAL, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.micButton}>
              {phase === 'processing' || phase === 'answering' ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <MicGlyph />
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Text style={styles.micHelp}>버튼을 누르고 있는 동안 말씀해 주세요 (최대 30초)</Text>
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
            title="음성으로 AI에게 물어보세요"
            subtitle="예: 요즘 머리가 푸석해 / 다음 시술은 언제가 좋을까요?"
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
    </View>
  );
}

const MIC_SIZE = 140;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  micSection: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  hint: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  recordingRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 8 },
  recDot: { backgroundColor: '#EF4444', borderRadius: 5, height: 10, width: 10 },
  recordingLabel: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  micPressable: { borderRadius: MIC_SIZE / 2 },
  micPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  micButton: {
    alignItems: 'center',
    borderRadius: MIC_SIZE / 2,
    height: MIC_SIZE,
    justifyContent: 'center',
    width: MIC_SIZE,
  },
  micHelp: { color: colors.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },
  micIconWrap: { alignItems: 'center' },
  micHead: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 28,
    width: 22,
  },
  micStem: {
    backgroundColor: '#FFFFFF',
    height: 14,
    marginTop: 2,
    width: 4,
  },
  micBase: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 4,
    marginTop: 2,
    width: 28,
  },
  chatList: { flex: 1 },
  chatContent: { gap: 10, padding: 16, paddingBottom: 8 },
  loader: { marginTop: 24 },
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
