import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { getCurrentUser } from '../../lib/auth';
import { DESIGNER_WELCOME_SLIDES } from '../../lib/designer-welcome-slides';
import { getProfileScreenData, type DesignerStats } from '../../lib/profile';
import { colors } from '../../lib/theme';
import { DesignerWelcomeCarousel } from '../../src/components/designer-welcome-carousel';
import { DesignerWelcomeTodayCard } from '../../src/components/designer-welcome-today-card';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { LoadingState } from '../../src/components/loading-state';

export default function DesignerWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0));
  const [designerName, setDesignerName] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState<DesignerStats | null>(null);
  const [isReady, setIsReady] = useState(false);

  const greeting = useMemo(() => {
    const trimmed = designerName?.trim();

    if (trimmed) {
      return `${trimmed} 님, 환영합니다`;
    }

    return '디자이너님, 환영합니다';
  }, [designerName]);

  useEffect(() => {
    Animated.timing(fadeAnim.current, {
      toValue: 1,
      duration: 550,
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

        if (user.role !== 'designer') {
          router.replace('/today-care');
          return;
        }

        const screenData = await getProfileScreenData();

        if (isMounted) {
          setDesignerName(screenData?.profile.name ?? null);

          if (screenData?.stats.kind === 'designer') {
            setTodayStats(screenData.stats);
          }

          setIsReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const goToSalon = () => {
    router.replace('/designer/clients');
  };

  if (!isReady) {
    return <LoadingState message="준비 중..." />;
  }

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          opacity: fadeAnim.current,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 88,
        },
      ]}>
      <StatusBar style="dark" />

      <Text style={styles.sectionLabel}>✨ 오늘의 메시지 ✨</Text>
      <View style={styles.divider} />

      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.lead}>희망을 담은 한마디로 하루를 시작해 보세요</Text>

      <View style={styles.carouselWrap}>
        <DesignerWelcomeCarousel slides={DESIGNER_WELCOME_SLIDES} />
      </View>

      {todayStats ? (
        <View style={styles.todayCardWrap}>
          <DesignerWelcomeTodayCard
            monthTreatmentCount={todayStats.monthTreatmentCount}
            pendingSettlementCount={todayStats.pendingSettlementCount}
            regularCustomerCount={todayStats.regularCustomerCount}
          />
        </View>
      ) : null}

      <Pressable
        onPress={goToSalon}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
        <Text style={styles.primaryButtonText}>내 살롱으로 시작하기 →</Text>
      </Pressable>

      <DesignerBottomTabBar />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 24,
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
  greeting: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 28,
    textAlign: 'center',
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  carouselWrap: {
    marginTop: 28,
  },
  todayCardWrap: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 120,
    paddingBottom: 12,
  },
  primaryButton: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
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
});
