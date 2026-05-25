import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getCurrentUser } from '../lib/auth';
import { loadTodayCareScreenData, type TodayCareScreenData } from '../lib/daily-insights';
import { getDamageScoreColor } from '../lib/today-care-content';
import { colors } from '../lib/theme';
import { LoadingState } from '../src/components/loading-state';

export default function TodayCareScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0));
  const [data, setData] = useState<TodayCareScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim.current, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

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

        const care = await loadTodayCareScreenData();

        if (!isMounted) {
          return;
        }

        if (!care) {
          router.replace('/home');
          return;
        }

        setData(care);
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

  if (isLoading) {
    return <LoadingState message="오늘의 케어 불러오는 중..." />;
  }

  if (!data) {
    return null;
  }

  const scoreColor =
    typeof data.damageLevel === 'number' ? getDamageScoreColor(data.damageLevel) : colors.muted;

  return (
    <Animated.View
      style={[
        styles.screen,
        { opacity: fadeAnim.current, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      <StatusBar style="dark" />

      <View style={styles.topSpacer} />

      <Text style={styles.sectionLabel}>💡 오늘의 케어</Text>
      <View style={styles.divider} />

      <View style={styles.gap40} />

      {data.damageScoreLabel ? (
        <Text style={[styles.damageScore, { color: scoreColor }]}>{data.damageScoreLabel}</Text>
      ) : null}

      <View style={styles.gap10} />

      <Text style={styles.headline}>{data.headline}</Text>

      <View style={styles.gap40} />

      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{data.message}</Text>
      </View>

      <View style={styles.flexFill} />

      <Pressable
        onPress={() => router.replace('/home')}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
        <Text style={styles.primaryButtonText}>내 다이어리 보기 →</Text>
      </Pressable>

      <View style={styles.bottomSpacer} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 32,
  },
  topSpacer: {
    flex: 0.25,
    minHeight: 48,
  },
  sectionLabel: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    alignSelf: 'center',
    backgroundColor: colors.purple,
    height: 2,
    marginTop: 12,
    width: 60,
  },
  gap40: {
    height: 40,
  },
  gap10: {
    height: 10,
  },
  damageScore: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  headline: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  messageText: {
    color: '#444444',
    fontSize: 16,
    lineHeight: 16 * 1.6,
    textAlign: 'center',
  },
  flexFill: {
    flex: 1,
    minHeight: 24,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    width: '100%',
  },
  primaryPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 40,
  },
});
