import { router, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
  DesignerClientListItem,
  getDesignerClientListItems,
  renewCustomerInvitation,
} from '../../lib/customer-invitations';
import { groupDesignerClientListItems } from '../../lib/designer-client-groups';
import {
  DESIGNER_ONBOARDING_SLIDES,
  markOnboardingSeen,
  shouldShowOnboarding,
} from '../../lib/onboarding';
import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { OnboardingModal } from '../../src/components/onboarding-modal';
import { Treatment } from '../../lib/treatments';

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function getInitial(name?: string | null) {
  return name?.trim().slice(0, 1) || '?';
}

function getInviteBadgeMeta(status?: DesignerClientListItem['inviteStatus']) {
  if (status === 'pending') {
    return { label: '초대 발송됨', style: styles.inviteActiveBadge, textStyle: styles.inviteActiveText };
  }

  if (status === 'expired') {
    return { label: '만료됨', style: styles.inviteExpiredBadge, textStyle: styles.inviteExpiredText };
  }

  if (status === 'used') {
    return { label: '가입 완료', style: styles.inviteUsedBadge, textStyle: styles.inviteUsedText };
  }

  return null;
}

function getPaymentBadge(treatment?: Treatment) {
  const normalized = normalizePaymentStatus(treatment?.payment_status);

  if (normalized === 'completed') {
    return { label: '정산 완료', style: styles.completedBadge, textStyle: styles.completedBadgeText };
  }

  if (normalized === 'escrow') {
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

function DesignerClientCard({
  item,
  onPress,
  onReinvite,
  showCustomerName = true,
}: {
  item: DesignerClientListItem;
  onPress: () => void;
  onReinvite?: () => void;
  showCustomerName?: boolean;
}) {
  const inviteBadge = getInviteBadgeMeta(item.inviteStatus);
  const paymentBadge = item.isRegistered ? getPaymentBadge(item.treatment) : inviteBadge;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(item.customerName)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <View style={styles.cardTopRow}>
          <Text style={styles.customerName}>
            {showCustomerName ? item.customerName : item.treatmentTitle}
          </Text>
          {paymentBadge ? (
            <View style={[styles.statusBadge, paymentBadge.style]}>
              <Text style={[styles.statusText, paymentBadge.textStyle]}>{paymentBadge.label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.treatmentMeta}>
          {formatDate(item.treatmentDate)} · {item.treatment?.treatment_type ?? '시술'}
        </Text>
        {showCustomerName ? <Text style={styles.treatmentTitle}>{item.treatmentTitle}</Text> : null}
        {item.inviteCode && item.inviteStatus === 'pending' ? (
          <Text style={styles.inviteCodeText}>코드 {item.inviteCode}</Text>
        ) : null}
        {(item.inviteStatus === 'pending' || item.inviteStatus === 'expired') && onReinvite ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onReinvite();
            }}
            style={styles.reinviteButton}>
            <Text style={styles.reinviteText}>
              {item.inviteStatus === 'pending' ? '초대 다시 보내기' : '재초대'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function DesignerClientsScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const escrowOnly = filterParam === 'escrow';
  const [clientItems, setClientItems] = useState<DesignerClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadClients = useCallback(() => {
    setIsLoading(true);

    getDesignerClientListItems()
      .then((items) => {
        setClientItems(items);
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

  const visibleItems = useMemo(() => {
    let items = clientItems;

    if (escrowOnly) {
      items = items.filter(
        (item) =>
          item.treatment && normalizePaymentStatus(item.treatment.payment_status) === 'escrow',
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.customerName,
        item.treatmentTitle,
        item.treatment?.treatment_type ?? '',
        item.inviteCode ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clientItems, escrowOnly, searchQuery]);

  const clientGroups = useMemo(
    () => groupDesignerClientListItems(visibleItems),
    [visibleItems],
  );

  const summary = useMemo(() => {
    const now = new Date();

    return {
      monthCount: clientItems.filter((item) => {
        const date = new Date(`${item.treatmentDate}T00:00:00`);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }).length,
      waitingCount: clientItems.filter(
        (item) => item.treatment && normalizePaymentStatus(item.treatment.payment_status) === 'escrow',
      ).length,
    };
  }, [clientItems]);

  const handleReinvite = (item: DesignerClientListItem) => {
    if (!item.invitationId || !item.treatmentId) {
      return;
    }

    Promise.resolve()
      .then(async () => {
        await renewCustomerInvitation({
          invitationId: item.invitationId!,
          treatmentId: item.treatmentId,
          customerName: item.treatment?.customer_name?.trim() || item.customerName,
        });
        showSuccessAlert('새 초대 코드를 만들었어요. 이전 코드는 더 이상 사용할 수 없어요.');
        loadClients();
      })
      .catch((error) => {
        showErrorAlert(getErrorMessage(error, '재초대에 실패했습니다.'));
      });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>내 자산</Text>
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
        ) : clientItems.length === 0 ? (
          <EmptyState
            actionLabel="첫 시술을 추가해보세요"
            icon="👥"
            onAction={() => router.push('/designer/input')}
            subtitle="새 시술을 입력하면 고객 목록이 채워집니다"
            title="아직 고객이 없어요"
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState icon="🔍" title="검색 결과가 없어요" subtitle="다른 검색어를 시도해보세요" />
        ) : (
          <View style={styles.list}>
            {clientGroups.map((group) => (
              <View key={group.key} style={styles.clientGroup}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupAvatar}>
                    <Text style={styles.groupAvatarText}>{getInitial(group.customerName)}</Text>
                  </View>
                  <View style={styles.groupHeaderText}>
                    <Text style={styles.groupTitle}>{group.customerName}</Text>
                    <Text style={styles.groupMeta}>시술 {group.items.length}건</Text>
                  </View>
                </View>
                <View style={styles.groupCards}>
                  {group.items.map((item) => (
                    <DesignerClientCard
                      key={item.key}
                      item={item}
                      showCustomerName={false}
                      onPress={() => detailRouter.push(`/designer/treatment/${item.treatmentId}`)}
                      onReinvite={() => handleReinvite(item)}
                    />
                  ))}
                </View>
              </View>
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
    gap: 22,
  },
  clientGroup: {
    gap: 10,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  groupAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  groupAvatarText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '900',
  },
  groupHeaderText: {
    flex: 1,
    gap: 2,
  },
  groupTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  groupMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  groupCards: {
    gap: 10,
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
  inviteCodeText: {
    color: '#7B5EE6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  reinviteButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD4D5',
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reinviteText: {
    color: '#FF5A5F',
    fontSize: 12,
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
  inviteActiveBadge: {
    backgroundColor: '#E0D7FA',
  },
  inviteActiveText: {
    color: '#7B5EE6',
  },
  inviteExpiredBadge: {
    backgroundColor: '#FFD4D5',
  },
  inviteExpiredText: {
    color: '#FF5A5F',
  },
  inviteUsedBadge: {
    backgroundColor: '#CCF2EC',
  },
  inviteUsedText: {
    color: '#00C2A8',
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
