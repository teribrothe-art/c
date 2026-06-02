import { Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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

import {
  DIARY_FILTER_OPTIONS,
  DiaryFilterKey,
  treatmentMatchesDiaryFilter,
} from '../../lib/diary-filters';
import { filterTreatmentsByYear, sortTreatmentsInYear } from '../../lib/diary-years';
import { getErrorMessage } from '../../lib/errors';
import { filterTreatmentsByQuery } from '../../lib/treatment-search';
import { safePush } from '../../lib/safe-navigate';
import { getTreatments, Treatment } from '../../lib/treatments';
import { colors } from '../../lib/theme';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { TreatmentDiaryCard } from '../../src/components/treatment-diary-card';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';
import { TAB_BAR_BOTTOM_INSET } from '../../src/components/role-bottom-tab-bar';

export default function DiaryYearDetailScreen() {
  const insets = useSafeAreaInsets();
  const { year: yearParam } = useLocalSearchParams<{ year?: string }>();
  const selectedYear = Number.parseInt(String(yearParam ?? ''), 10);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DiaryFilterKey>('전체');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadYearDiary = useCallback(() => {
    if (!Number.isFinite(selectedYear)) {
      router.replace('/diary');
      return Promise.resolve();
    }

    setIsLoading(true);

    return getTreatments()
      .then(({ user, treatments: nextTreatments }) => {
        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role === 'designer') {
          router.replace('/designer/home' as Href);
          return;
        }

        setTreatments(nextTreatments);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '시술 기록을 불러오지 못했습니다.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedYear]);

  useEffect(() => {
    void loadYearDiary();
  }, [loadYearDiary]);

  useFocusEffect(
    useCallback(() => {
      void loadYearDiary();
    }, [loadYearDiary]),
  );

  const yearTreatments = useMemo(() => {
    if (!Number.isFinite(selectedYear)) {
      return [];
    }

    return sortTreatmentsInYear(filterTreatmentsByYear(treatments, selectedYear));
  }, [selectedYear, treatments]);

  const filteredTreatments = useMemo(() => {
    const byType = yearTreatments.filter((treatment) =>
      treatmentMatchesDiaryFilter(
        treatment.treatment_type,
        treatment.treatment_title,
        selectedFilter,
      ),
    );

    return filterTreatmentsByQuery(byType, searchQuery);
  }, [selectedFilter, searchQuery, yearTreatments]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{selectedYear}년 내 다이어리</Text>
          <Text style={styles.subtitle}>시술 기록을 선택하세요</Text>
        </View>
        <Pressable
          onPress={() => setSearchOpen((open) => !open)}
          style={styles.searchButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_BOTTOM_INSET + insets.bottom }]}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
        {searchOpen ? (
          <TextInput
            style={styles.searchInput}
            placeholder="시술명·디자이너명 검색"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        ) : null}

        <View style={styles.filterWrap}>
          {DIARY_FILTER_OPTIONS.map((filter) => {
            const selected = selectedFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                accessibilityRole="button"
                hitSlop={4}
                onPress={() => setSelectedFilter(filter.key)}
                style={[styles.filterTab, selected && styles.filterTabSelected]}>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {filter.icon} {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>기록을 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : yearTreatments.length === 0 ? (
          <EmptyState
            icon="📖"
            subtitle="다른 연도를 선택해보세요"
            title={`${selectedYear}년 기록이 없어요`}
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
                treatment={treatment}
                onPress={() =>
                  safePush({
                    pathname: '/treatment/[id]',
                    params: { id: treatment.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backIcon: {
    color: '#1A1A2E',
    fontSize: 40,
    lineHeight: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  searchButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  searchIcon: {
    fontSize: 22,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 22,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  filterTabSelected: {
    backgroundColor: colors.coral,
  },
  filterText: {
    color: colors.muted,
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
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
