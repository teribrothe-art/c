import { router, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { getErrorMessage } from '../../lib/errors';
import { normalizePaymentStatus } from '../../lib/payment-status';
import {
  DESIGNER_ONBOARDING_SLIDES,
  markOnboardingSeen,
  shouldShowOnboarding,
} from '../../lib/onboarding';
import { filterTreatmentsByQuery } from '../../lib/treatment-search';
import { getDesignerTreatments, Treatment } from '../../lib/treatments';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { OnboardingModal } from '../../src/components/onboarding-modal';

type PaymentStatus = NonNullable<Treatment['payment_status']>;

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function getInitial(name?: string | null) {
  return name?.trim().slice(0, 1) || '?';
}

function isCurrentMonth(date: string) {
  const treatmentDate = new Date(`${date}T00:00:00`);
  const now = new Date();
  return (
    treatmentDate.getFullYear() === now.getFullYear() &&
    treatmentDate.getMonth() === now.getMonth()
  );
}

function getStatusMeta(status?: PaymentStatus | null, treatmentId?: string, paidHint?: boolean) {
  const normalized = normalizePaymentStatus(status);

  if (normalized === 'completed') {
    return { label: '정산 완료', style: styles.completedBadge, textStyle: styles.completedBadgeText };
  }

  if (paidHint || normalized === 'escrow') {
    return {
      label: '결제 완료, 피드백 대기',
      style: styles.paidWaitingBadge,
      textStyle: styles.paidWaitingBadgeText,
    };
  }

  if (normalized === 'payment_requested') {
    return { label: '결제 요청', style: styles.pendingBadge, textStyle: styles.pendingBadgeText };
  }

  return { label: '결제 대기', style: styles.pendingBadge, textStyle: styles.pendingBadgeText };
}

function ClientTreatmentCard({ onPress, treatment }: { onPress: () => void; treatment: Treatment }) {
  const status = getStatusMeta(
    treatment.payment_status,
    treatment.id,
    normalizePaymentStatus(treatment.payment_status) === 'escrow',
  );

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(treatment.customer_name)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <View style={styles.cardTopRow}>
          <Text style={styles.customerName}>{treatment.customer_name || '고객'}</Text>
          <View style={[styles.statusBadge, status.style]}>
            <Text style={[styles.statusText, status.textStyle]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.treatmentMeta}>
          {formatDate(treatment.treatment_date)} · {treatment.treatment_type}
        </Text>
        <Text style={styles.treatmentTitle}>{treatment.treatment_title}</Text>
        {typeof treatment.price === 'number' && (
          <Text style={styles.priceText}>{treatment.price.toLocaleString('ko-KR')}원</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function DesignerClientsScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadClients = useCallback(() => {
    setIsLoading(true);

    getDesignerTreatments()
      .then(({ user, treatments: nextTreatments }) => {
        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== 'designer') {
          router.replace('/home');
          return;
        }

        setTreatments(nextTreatments);
        setErrorMessage('');
        shouldShowOnboarding('designer').then(setShowOnboarding);
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '고객 시술을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients]),
  );

  const visibleTreatments = useMemo(
    () => filterTreatmentsByQuery(treatments, searchQuery, { includeProducts: true }),
    [treatments, searchQuery],
  );

  const summary = useMemo(() => {
    return {
      monthCount: treatments.filter((treatment) => isCurrentMonth(treatment.treatment_date)).length,
      waitingCount: treatments.filter(
        (treatment) => normalizePaymentStatus(treatment.payment_status) === 'escrow',
      ).length,
    };
  }, [treatments]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>내 고객들</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setSearchOpen((open) => !open)}
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
              <Text style={styles.notificationIcon}>🔍</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
              <Text style={styles.notificationIcon}>🔔</Text>
            </Pressable>
          </View>
        </View>

        {searchOpen ? (
          <TextInput
            style={styles.searchInput}
            placeholder="고객·시술·약품 검색"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>이번 달 시술</Text>
            <Text style={styles.summaryValue}>{summary.monthCount}건</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>정산 대기</Text>
            <Text style={[styles.summaryValue, styles.waitingValue]}>{summary.waitingCount}건</Text>
          </View>
        </View>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>고객 목록을 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : treatments.length === 0 ? (
          <EmptyState
            actionLabel="첫 시술을 추가해보세요"
            icon="👥"
            onAction={() => router.push('/designer/input')}
            subtitle="새 시술을 입력하면 고객 목록이 채워집니다"
            title="아직 고객이 없어요"
          />
        ) : visibleTreatments.length === 0 ? (
          <EmptyState icon="🔍" title="검색 결과가 없어요" subtitle="다른 검색어를 시도해보세요" />
        ) : (
          <View style={styles.list}>
            {visibleTreatments.map((treatment) => (
              <ClientTreatmentCard
                key={treatment.id}
                onPress={() => detailRouter.push(`/designer/treatment/${treatment.id}`)}
                treatment={treatment}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <DesignerBottomTabBar />

      <OnboardingModal
        visible={showOnboarding}
        slides={DESIGNER_ONBOARDING_SLIDES}
        onComplete={() => {
          void markOnboardingSeen('designer');
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 30,
    fontWeight: '800',
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationIcon: {
    fontSize: 22,
  },
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
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  waitingValue: {
    color: '#FF5A5F',
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#EFEFF4',
  },
  list: {
    gap: 14,
  },
  clientCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  clientCardPressed: {
    opacity: 0.82,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#FF5A5F',
    fontSize: 18,
    fontWeight: '900',
  },
  clientInfo: {
    flex: 1,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  treatmentMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  treatmentTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  priceText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  completedBadge: {
    backgroundColor: '#CCF2EC',
  },
  completedBadgeText: {
    color: '#00C2A8',
  },
  requiredBadge: {
    backgroundColor: '#FFD4D5',
  },
  requiredBadgeText: {
    color: '#FF5A5F',
  },
  paidWaitingBadge: {
    backgroundColor: '#FFE8E9',
  },
  paidWaitingBadgeText: {
    color: '#FF5A5F',
    fontSize: 11,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#FFF0C7',
  },
  pendingBadgeText: {
    color: '#FFB627',
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
