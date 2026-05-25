import { Href, router, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../src/components/bottom-tab-bar';
import type { DailyCareSnapshot } from '../lib/daily-care';
import { getTodayDailyCare } from '../lib/daily-insights';
import { getErrorMessage } from '../lib/errors';
import { getCustomerPendingPayments } from '../lib/payments';
import {
  CUSTOMER_ONBOARDING_SLIDES,
  markOnboardingSeen,
  shouldShowOnboarding,
} from '../lib/onboarding';
import {
  DIARY_FILTER_OPTIONS,
  DiaryFilterKey,
  treatmentMatchesDiaryFilter,
} from '../lib/diary-filters';
import { filterTreatmentsByQuery } from '../lib/treatment-search';
import { getTreatments, Treatment } from '../lib/treatments';
import { EmptyState } from '../src/components/empty-state';
import { LoadingState } from '../src/components/loading-state';
import { OnboardingModal } from '../src/components/onboarding-modal';
import { TodayCareCard } from '../src/components/today-care-card';
import { TreatmentDiaryCard } from '../src/components/treatment-diary-card';

export default function DiaryHomeScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<DiaryFilterKey>('전체');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyCare, setDailyCare] = useState<DailyCareSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const { user, treatments: nextTreatments } = await getTreatments();

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role === 'designer') {
          router.replace('/designer/clients' as Href);
          return;
        }

        setTreatments(nextTreatments);
        const pending = await getCustomerPendingPayments();
        setPendingPayments(pending);
        const care = await getTodayDailyCare(nextTreatments);
        setDailyCare(care);
        setErrorMessage('');
        shouldShowOnboarding('customer').then(setShowOnboarding);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = getErrorMessage(error, '시술 기록을 불러오지 못했습니다.');
        setErrorMessage(message);
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


  const reloadPending = useCallback(() => {
    getCustomerPendingPayments()
      .then(setPendingPayments)
      .catch(() => setPendingPayments([]));
  }, []);

  const reloadDailyCare = useCallback(() => {
    if (treatments.length === 0) {
      setDailyCare(null);
      return;
    }

    getTodayDailyCare(treatments)
      .then(setDailyCare)
      .catch(() => setDailyCare(null));
  }, [treatments]);

  useFocusEffect(
    useCallback(() => {
      reloadPending();
      reloadDailyCare();
    }, [reloadPending, reloadDailyCare]),
  );

  const filteredTreatments = useMemo(() => {
    const byType = treatments.filter((treatment) =>
      treatmentMatchesDiaryFilter(
        treatment.treatment_type,
        treatment.treatment_title,
        selectedFilter,
      ),
    );
    return filterTreatmentsByQuery(byType, searchQuery);
  }, [selectedFilter, treatments, searchQuery]);

  const handleViewDiaryFromCare = () => {
    router.push('/diary');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>

        {pendingPayments.length > 0 ? (
          <Pressable
            style={styles.paymentBanner}
            onPress={() => router.push(`/payment/${pendingPayments[0].id}` as const)}
          >
            <Text style={styles.paymentBannerTitle}>결제 필요</Text>
            <Text style={styles.paymentBannerSub}>
              {pendingPayments[0].designer_name} · {(pendingPayments[0].price ?? 0).toLocaleString()}원 · 결제하기
            </Text>
          </Pressable>
        ) : null}

        {!isLoading && !errorMessage && dailyCare ? (
          <TodayCareCard
            care={dailyCare}
            onViewDiary={handleViewDiaryFromCare}
            onAiConsult={() => router.push('/voice')}
          />
        ) : null}

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>내 다이어리</Text>
            <Pressable onPress={() => router.push('/diary')} style={styles.yearBrowseLink}>
              <Text style={styles.yearBrowseText}>연도별 보기 ›</Text>
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setSearchOpen((open) => !open)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
              <Text style={styles.headerIcon}>🔍</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
              <Text style={styles.headerIcon}>🔔</Text>
            </Pressable>
          </View>
        </View>

        {searchOpen ? (
          <TextInput
            style={styles.searchInput}
            placeholder="시술명·디자이너명 검색"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        ) : null}

        <ScrollView
          contentContainerStyle={styles.filterContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}>
          {DIARY_FILTER_OPTIONS.map((filter) => {
            const selected = selectedFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                style={[styles.filterTab, selected && styles.filterTabSelected]}>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {filter.icon} {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>기록을 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : treatments.length === 0 ? (
          <EmptyState
            icon="📖"
            subtitle="디자이너가 시술을 입력하면 여기에 자동으로 나타나요"
            title="아직 시술 기록이 없어요"
          />
        ) : filteredTreatments.length === 0 ? (
          <EmptyState
            icon="🔍"
            subtitle={searchQuery ? '다른 검색어를 시도해보세요' : '다른 필터를 선택해보세요'}
            title={searchQuery ? '검색 결과가 없어요' : '선택한 필터에 맞는 기록이 없어요'}
          />
        ) : (
          <View style={styles.timeline}>
            {filteredTreatments.map((treatment) => (
              <TreatmentDiaryCard
                key={treatment.id}
                onPress={() =>
                  detailRouter.push({
                    pathname: '/treatment/[id]',
                    params: { id: treatment.id },
                  })
                }
                treatment={treatment}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomTabBar />

      <OnboardingModal
        visible={showOnboarding}
        slides={CUSTOMER_ONBOARDING_SLIDES}
        onComplete={() => {
          void markOnboardingSeen('customer');
          setShowOnboarding(false);
        }}
      />
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 30,
    fontWeight: '800',
  },
  yearBrowseLink: {
    marginTop: 6,
    paddingVertical: 2,
  },
  yearBrowseText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '700',
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonPressed: { opacity: 0.7 },
  headerIcon: { fontSize: 22 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterScroll: {
    marginBottom: 20,
    marginHorizontal: -22,
  },
  filterContent: {
    gap: 10,
    paddingHorizontal: 22,
  },
  filterTab: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  filterTabSelected: {
    backgroundColor: '#FF5A5F',
  },
  filterText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  timeline: {
    gap: 16,
  },
  stateBox: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
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
});
