import { router, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
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

import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { getErrorMessage } from '../../lib/errors';
import { normalizePaymentStatus } from '../../lib/payment-status';
import { groupDesignerClientsByDate } from '../../lib/designer-customer-grid';
import {
  DesignerClientListItem,
  getDesignerClientListItems,
} from '../../lib/customer-invitations';
import { peekDesignerClientListCache } from '../../lib/designer-workspace-cache';
import {
  DESIGNER_ONBOARDING_SLIDES,
  markOnboardingSeen,
  shouldShowOnboarding,
} from '../../lib/onboarding';
import { CustomerGridByDate } from '../../src/components/customer-grid-by-date';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { OnboardingModal } from '../../src/components/onboarding-modal';


export default function DesignerClientsScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const [clientItems, setClientItems] = useState<DesignerClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadClients = useCallback(() => {
    const cached = peekDesignerClientListCache();

    if (cached) {
      setClientItems(cached);
      setErrorMessage('');
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

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
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return clientItems;
    }

    return clientItems.filter((item) => {
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
  }, [clientItems, searchQuery]);

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

  const dateGroups = useMemo(() => groupDesignerClientsByDate(visibleItems), [visibleItems]);

  useEffect(() => {
    setSelectedDate(null);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedDate && !dateGroups.some((group) => group.date === selectedDate)) {
      setSelectedDate(null);
    }
  }, [dateGroups, selectedDate]);

  const handleGridPress = useCallback(
    (key: string) => {
      const item = visibleItems.find((row) => row.key === key);

      if (item) {
        detailRouter.push(`/designer/treatment/${item.treatmentId}`);
      }
    },
    [detailRouter, visibleItems],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>고객</Text>
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
          <CustomerGridByDate
            groups={dateGroups}
            onPressItem={handleGridPress}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
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
