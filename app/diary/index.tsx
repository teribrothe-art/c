import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDiaryYearSummaries } from '../../lib/diary-years';
import { getErrorMessage } from '../../lib/errors';
import { getTreatments, Treatment } from '../../lib/treatments';
import { colors } from '../../lib/theme';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';

export default function DiaryYearBrowseScreen() {
  const insets = useSafeAreaInsets();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    getTreatments()
      .then(({ user, treatments: nextTreatments }) => {
        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role === 'designer') {
          router.replace('/designer/clients');
          return;
        }

        setTreatments(nextTreatments);
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error, '시술 기록을 불러오지 못했습니다.'));
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

  const yearSummaries = useMemo(() => getDiaryYearSummaries(treatments), [treatments]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>다이어리 보기</Text>
          <Text style={styles.subtitle}>지난 연도부터 선택하세요</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="연도 목록 불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>목록을 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : yearSummaries.length === 0 ? (
          <EmptyState
            icon="📅"
            subtitle="디자이너가 시술을 입력하면 연도별로 볼 수 있어요"
            title="기록된 연도가 없어요"
          />
        ) : (
          <View style={styles.yearList}>
            {yearSummaries.map((item) => (
              <Pressable
                key={item.year}
                onPress={() =>
                  router.push({
                    pathname: '/diary/[year]',
                    params: { year: String(item.year) },
                  })
                }
                style={({ pressed }) => [styles.yearCard, pressed && styles.yearCardPressed]}>
                <View>
                  <Text style={styles.yearLabel}>{item.year}년</Text>
                  <Text style={styles.yearMeta}>내 다이어리 · 시술 {item.count}건</Text>
                </View>
                <Text style={styles.yearArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
  headerSpacer: {
    width: 44,
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
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  yearList: {
    gap: 12,
  },
  yearCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  yearCardPressed: {
    opacity: 0.85,
  },
  yearLabel: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '800',
  },
  yearMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  yearArrow: {
    color: colors.coral,
    fontSize: 28,
    fontWeight: '700',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    gap: 10,
    marginTop: 24,
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
