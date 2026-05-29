import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DailyCareSnapshot } from '../lib/daily-care';
import { getTodayDailyCare } from '../lib/daily-insights';
import { getErrorMessage } from '../lib/errors';
import { buildHomePromoSlides, type HomePromoSlide } from '../lib/home-promo-slides';
import { normalizePaymentStatus } from '../lib/payment-status';
import { safePush } from '../lib/safe-navigate';
import { getTreatments, Treatment } from '../lib/treatments';
import { getWeatherHairCareAdvice, type WeatherHairCareAdvice } from '../lib/weather-hair-care';
import { AiConsultQuickCard } from '../src/components/ai-consult-quick-card';
import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { HomePromoCarousel } from '../src/components/home-promo-carousel';
import { LoadingState } from '../src/components/loading-state';
import { TodayCareCard } from '../src/components/today-care-card';
import { WeatherHairCareCard } from '../src/components/weather-hair-care-card';

export default function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dailyCare, setDailyCare] = useState<DailyCareSnapshot | null>(null);
  const [weatherCare, setWeatherCare] = useState<WeatherHairCareAdvice | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const promoCarouselHeight = useMemo(
    () => Math.max(240, Dimensions.get('window').height * 0.32),
    [],
  );

  const loadHomeData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const { user, treatments: nextTreatments } = await getTreatments();

      if (!user) {
        router.replace('/');
        return;
      }

      if (user.role === 'designer') {
        router.replace('/designer/clients' as Href);
        return;
      }

      if (user.role === 'store') {
        router.replace('/store');
        return;
      }

      if (user.role === 'admin') {
        router.replace('/admin');
        return;
      }

      setTreatments(nextTreatments);
      setPendingPayments(
        nextTreatments.filter(
          (treatment) => normalizePaymentStatus(treatment.payment_status) === 'payment_requested',
        ),
      );
      setErrorMessage('');

      void getTodayDailyCare(nextTreatments)
        .then(setDailyCare)
        .catch(() => setDailyCare(null));

      setIsWeatherLoading(true);
      getWeatherHairCareAdvice(nextTreatments)
        .then(setWeatherCare)
        .catch(() => setWeatherCare(null))
        .finally(() => setIsWeatherLoading(false));
    } catch (error) {
      const message = getErrorMessage(error, '홈 정보를 불러오지 못했습니다.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData({ silent: true });
    }, [loadHomeData]),
  );

  const promoSlides = useMemo(() => buildHomePromoSlides(treatments), [treatments]);

  const handlePromoPress = (slide: HomePromoSlide) => {
    if (slide.href) {
      safePush(slide.href);
    }
  };

  const openVoice = () => {
    safePush('/voice');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadHomeData({ silent: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FF5A5F" />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>홈</Text>
            <Text style={styles.subtitle}>오늘의 케어와 맞춤 추천을 확인하세요</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => safePush('/notifications')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
            <Text style={styles.headerIcon}>🔔</Text>
          </Pressable>
        </View>

        {pendingPayments.length > 0 ? (
          <Pressable
            style={styles.paymentBanner}
            onPress={() => {
              if (pendingPayments.length > 1) {
                router.push('/customer/payments');
                return;
              }

              router.push(`/payment/${pendingPayments[0].id}` as const);
            }}>
            <Text style={styles.paymentBannerTitle}>
              {pendingPayments.length > 1 ? `결제 필요 ${pendingPayments.length}건` : '결제 필요'}
            </Text>
            <Text style={styles.paymentBannerSub}>
              {pendingPayments.length > 1
                ? '시술을 선택해 금액·영수증을 확인하고 결제하세요'
                : `${pendingPayments[0].designer_name} · ${(pendingPayments[0].price ?? 0).toLocaleString()}원 · 결제하기`}
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>정보를 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadHomeData()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>다시 불러오기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.topSection}>
            <AiConsultQuickCard onPress={openVoice} />
            {dailyCare ? (
              <TodayCareCard
                care={dailyCare}
                onViewDiary={() => safePush('/home')}
                onAiConsult={openVoice}
              />
            ) : null}
            <WeatherHairCareCard
              advice={weatherCare}
              isLoading={isWeatherLoading}
              onAiConsult={openVoice}
            />
            <HomePromoCarousel
              minHeight={promoCarouselHeight}
              slides={promoSlides}
              onPressSlide={handlePromoPress}
            />
          </View>
        )}
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  headerIcon: {
    fontSize: 22,
  },
  paymentBanner: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
  },
  paymentBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  paymentBannerSub: {
    color: '#C7C7D1',
    fontSize: 13,
    fontWeight: '600',
  },
  topSection: {
    gap: 0,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
