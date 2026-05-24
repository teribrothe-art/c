import { Href, router, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { getErrorMessage } from '../lib/errors';
import { getCustomerPendingPayments } from '../lib/payments';
import { getTreatments, Treatment } from '../lib/treatments';
import { EmptyState } from '../src/components/empty-state';
import { LoadingState } from '../src/components/loading-state';

type FilterKey = '전체' | '컷' | '컬러' | '펌';

const filters: FilterKey[] = ['전체', '컷', '컬러', '펌'];

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function matchesFilter(treatmentType: string, selectedFilter: FilterKey) {
  if (selectedFilter === '전체') {
    return true;
  }

  if (selectedFilter === '컷') {
    return treatmentType.includes('컷') || treatmentType.includes('커트');
  }

  if (selectedFilter === '컬러') {
    return (
      treatmentType.includes('컬러') ||
      treatmentType.includes('염색') ||
      treatmentType.includes('탈색') ||
      treatmentType.includes('토닝')
    );
  }

  return treatmentType.includes('펌') || treatmentType.includes('파마');
}

function TreatmentCard({ onPress, treatment }: { onPress: () => void; treatment: Treatment }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <Text style={styles.cardMeta}>
        {formatDate(treatment.treatment_date)} {treatment.designer_name ?? '담당 디자이너'}
      </Text>
      <Text style={styles.cardTitle}>{treatment.treatment_title}</Text>
      <View style={styles.tagRow}>
        <View style={[styles.tag, styles.typeTag]}>
          <Text style={[styles.tagText, styles.typeTagText]}>#{treatment.treatment_type}</Text>
        </View>
        {(treatment.products ?? []).map((product) => (
          <View key={product} style={[styles.tag, styles.productTag]}>
            <Text style={[styles.tagText, styles.productTagText]}>#{product}</Text>
          </View>
        ))}
        {typeof treatment.damage_level === 'number' && (
          <View style={[styles.tag, styles.damageTag]}>
            <Text style={[styles.tagText, styles.damageTagText]}>#손상{treatment.damage_level}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function DiaryHomeScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('전체');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
        setErrorMessage('');
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

  useFocusEffect(
    useCallback(() => {
      reloadPending();
    }, [reloadPending]),
  );

  const filteredTreatments = useMemo(
    () => treatments.filter((treatment) => matchesFilter(treatment.treatment_type, selectedFilter)),
    [selectedFilter, treatments],
  );

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

        <View style={styles.header}>
          <Text style={styles.title}>내 다이어리</Text>
          <Pressable onPress={() => router.push('/notifications')} style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.filterContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}>
          {filters.map((filter) => {
            const selected = selectedFilter === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterTab, selected && styles.filterTabSelected]}>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {filter}
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
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>선택한 필터에 맞는 기록이 없어요</Text>
            <Text style={styles.stateText}>다른 필터를 선택해보세요.</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {filteredTreatments.map((treatment) => (
              <TreatmentCard
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
  notificationButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationIcon: {
    fontSize: 24,
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
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.82,
  },
  cardMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeTag: {
    backgroundColor: '#FFD4D5',
  },
  typeTagText: {
    color: '#FF5A5F',
  },
  productTag: {
    backgroundColor: '#E0D7FA',
  },
  productTagText: {
    color: '#7B5EE6',
  },
  damageTag: {
    backgroundColor: '#CCF2EC',
  },
  damageTagText: {
    color: '#00C2A8',
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
