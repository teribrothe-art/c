import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../../lib/auth';
import type { DesignerClientListItem } from '../../lib/customer-invitations';
import { getDesignerClientListItems } from '../../lib/customer-invitations';
import {
  fetchDesignerPaymentDashboard,
  type DesignerPaymentDashboard,
} from '../../lib/designer-payment-stats';
import { mapDesignerClientsToGridItems } from '../../lib/designer-customer-grid';
import { countUniqueDesignerCustomers } from '../../lib/designer-home-stats';
import { getErrorMessage } from '../../lib/errors';
import { formatDesignerStoreLabel } from '../../lib/org-store-affiliation';
import { CustomerGrid } from '../../src/components/customer-grid';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import {
  currentDesignerMonthKey,
  DesignerHomeStatGrid,
  type DesignerHomeStatItem,
} from '../../src/components/designer-home-stat-grid';
import { LoadingState } from '../../src/components/loading-state';

export default function DesignerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<DesignerPaymentDashboard | null>(null);
  const [clientItems, setClientItems] = useState<DesignerClientListItem[]>([]);
  const [designerName, setDesignerName] = useState('디자이너');
  const [storeLabel, setStoreLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHome = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const user = await getCurrentUser();

      if (!user) {
        router.replace('/');
        return;
      }

      if (user.role !== 'designer') {
        router.replace('/customer-home');
        return;
      }

      const [paymentDashboard, items] = await Promise.all([
        fetchDesignerPaymentDashboard(),
        getDesignerClientListItems(),
      ]);

      setDashboard(paymentDashboard);
      setClientItems(items);
      setDesignerName(user.email.split('@')[0] || '디자이너');
      setStoreLabel(formatDesignerStoreLabel(user.id));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '홈 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  const uniqueCustomerCount = useMemo(
    () => countUniqueDesignerCustomers(clientItems),
    [clientItems],
  );

  const homeStatItems = useMemo((): DesignerHomeStatItem[] => {
    const monthKey = currentDesignerMonthKey();

    return [
      {
        key: 'month-revenue',
        label: '이번 달 정산',
        value: `${(dashboard?.monthRevenue ?? 0).toLocaleString('ko-KR')}원`,
        href: `/designer/revenue?month=${monthKey}` as const,
      },
      {
        key: 'month-treatments',
        label: '이번 달 시술',
        value: `${dashboard?.monthSettlementCount ?? 0}건`,
        href: '/designer/clients' as const,
      },
      {
        key: 'customers',
        label: '보유 고객',
        value: `${uniqueCustomerCount}명`,
        href: '/designer/clients' as const,
      },
      {
        key: 'pending-payout',
        label: '정산 대기',
        value: `${(dashboard?.pendingPayoutAmount ?? 0).toLocaleString('ko-KR')}원`,
        href: '/designer/revenue' as const,
      },
    ];
  }, [dashboard, uniqueCustomerCount]);

  const gridItems = useMemo(() => mapDesignerClientsToGridItems(clientItems), [clientItems]);

  const handleGridPress = useCallback(
    (key: string) => {
      const item = clientItems.find((row) => row.key === key);

      if (item) {
        router.push(`/designer/treatment/${item.treatmentId}`);
      }
    },
    [clientItems],
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadHome({ silent: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FF5A5F" />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.badge}>DESIGNER</Text>
            <Text style={styles.title}>홈</Text>
            <Text style={styles.subtitle}>
              {designerName}
              {storeLabel ? ` · ${storeLabel}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
            <Text style={styles.iconButtonText}>🔔</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>정보를 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadHome()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>다시 불러오기</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <DesignerHomeStatGrid items={homeStatItems} />

            {gridItems.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>고객</Text>
                <CustomerGrid items={gridItems} onPressItem={handleGridPress} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    gap: 16,
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    color: '#FF5A5F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
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
  iconButtonText: {
    fontSize: 22,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    padding: 24,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
