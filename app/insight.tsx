import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../lib/auth';
import {
  dismissTodayDailyInsight,
  loadInsightScreenData,
  type DailyInsightScreenData,
} from '../lib/daily-insights';
import { getErrorMessage } from '../lib/errors';
import { colors } from '../lib/theme';
import { LoadingState } from '../src/components/loading-state';

function FadeSlideIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export default function InsightScreen() {
  const insets = useSafeAreaInsets();
  const screenFade = useRef(new Animated.Value(0)).current;
  const [data, setData] = useState<DailyInsightScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [screenFade]);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const user = await getCurrentUser();

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role === 'designer') {
          router.replace('/designer/clients');
          return;
        }

        const insight = await loadInsightScreenData();

        if (!isMounted) {
          return;
        }

        if (!insight) {
          router.replace('/home');
          return;
        }

        setData(insight);
      })
      .catch(() => {
        if (isMounted) {
          router.replace('/home');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismissToday = async () => {
    if (!data || isDismissing) {
      return;
    }

    try {
      setIsDismissing(true);
      await dismissTodayDailyInsight(data.insightId);
      router.replace('/home');
    } catch (error) {
      setIsDismissing(false);
      const { showErrorAlert } = await import('../lib/alerts');
      showErrorAlert(getErrorMessage(error, '설정을 저장하지 못했어요.'));
    }
  };

  if (isLoading) {
    return <LoadingState message="오늘의 인사이트 준비 중..." />;
  }

  if (!data) {
    return null;
  }

  const messageLines = data.insightMessage.split('\n').filter(Boolean);
  const cardGradient =
    data.accentColor === colors.mint
      ? (['#FFFFFF', '#E8FBF7'] as const)
      : data.accentColor === colors.purple
        ? (['#FFFFFF', '#F0EBFF'] as const)
        : (['#FFFFFF', '#FFF0F0'] as const);

  return (
    <Animated.View style={[styles.screen, { opacity: screenFade }]}>
      <LinearGradient colors={['#FFF8F8', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}>
        <FadeSlideIn delay={80}>
          <Text style={styles.timeGreeting}>{data.timeGreeting}</Text>
          <Text style={styles.nameGreeting}>안녕하세요, {data.userName}님 👋</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={180} style={styles.dividerWrap}>
          <View style={styles.divider} />
        </FadeSlideIn>

        <FadeSlideIn delay={260}>
          <Text style={styles.sectionTitle}>💡 오늘의 케어 인사이트</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={340} style={styles.mainCardWrap}>
          <LinearGradient colors={cardGradient} style={styles.mainCard}>
            <Text style={[styles.damageScore, { color: data.accentColor }]}>{data.damageScoreLabel}</Text>
            <Text style={[styles.damageHeadline, { color: data.accentColor }]}>{data.damageHeadline}</Text>
          </LinearGradient>
        </FadeSlideIn>

        <FadeSlideIn delay={420} style={styles.quoteWrap}>
          <View style={styles.quoteBox}>
            {messageLines.map((line) => (
              <Text key={line} style={styles.quoteLine}>
                {line}
              </Text>
            ))}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={520} style={styles.actions}>
          <Pressable
            onPress={() => router.replace('/home')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryButtonText}>내 다이어리 보기 →</Text>
          </Pressable>

          <Pressable
            disabled={isDismissing}
            onPress={() => void handleDismissToday()}
            style={({ pressed }) => [styles.dismissLink, pressed && { opacity: 0.6 }]}>
            <Text style={styles.dismissText}>{isDismissing ? '저장 중...' : '오늘 안 보기'}</Text>
          </Pressable>
        </FadeSlideIn>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  timeGreeting: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameGreeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  dividerWrap: {
    marginVertical: 22,
  },
  divider: {
    backgroundColor: '#E8E8F0',
    height: 1,
    width: '100%',
  },
  sectionTitle: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
  },
  mainCardWrap: {
    marginBottom: 16,
  },
  mainCard: {
    borderRadius: 16,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  damageScore: {
    fontSize: 15,
    fontWeight: '700',
  },
  damageHeadline: {
    fontSize: 22,
    fontWeight: '800',
  },
  quoteWrap: {
    marginBottom: 28,
  },
  quoteBox: {
    backgroundColor: '#F3F3F7',
    borderRadius: 14,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quoteLine: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  quoteLineMuted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    alignItems: 'center',
    gap: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
  },
  primaryPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dismissLink: {
    padding: 8,
  },
  dismissText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
