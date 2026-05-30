import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../../lib/auth';
import {
  fetchDesignerPaymentDashboard,
  type DesignerPaymentDashboard,
} from '../../lib/designer-payment-stats';
import { getDesignerClientListItems } from '../../lib/customer-invitations';
import { getErrorMessage } from '../../lib/errors';
import { formatDesignerStoreLabel } from '../../lib/org-store-affiliation';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { LoadingState } from '../../src/components/loading-state';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function QuickLink({
  label,
  description,
  onPress,
}: {
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickLink, pressed && styles.quickLinkPressed]}>
      <View style={styles.quickLinkBody}>
        <Text style={styles.quickLinkLabel}>{label}</Text>
        <Text style={styles.quickLinkDescription}>{description}</Text>
      </View>
      <Text style={styles.quickLinkArrow}>›</Text>
    </Pressable>
  );
}

export default function DesignerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<DesignerPaymentDashboard | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
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

      const [paymentDashboard, clientItems] = await Promise.all([
        fetchDesignerPaymentDashboard(),
        getDesignerClientListItems(),
      ]);

      setDashboard(paymentDashboard);
      setCustomerCount(clientItems.length);
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
            <View style={styles.statGrid}>
              <StatCard
                label="이번 달 정산"
                value={`${(dashboard?.monthRevenue ?? 0).toLocaleString('ko-KR')}원`}
              />
              <StatCard label="이번 달 시술" value={`${dashboard?.monthSettlementCount ?? 0}건`} />
              <StatCard label="고객 기록" value={`${customerCount}건`} />
              <StatCard
                label="정산 대기"
                value={`${(dashboard?.pendingPayoutAmount ?? 0).toLocaleString('ko-KR')}원`}
              />
            </View>

            <View style={styles.quickLinks}>
              <QuickLink
                description="시술·초대 고객 목록"
                label="고객"
                onPress={() => router.push('/designer/clients')}
              />
              <QuickLink
                description="새 시술 기록 입력"
                label="시술"
                onPress={() => router.push('/designer/input')}
              />
              <QuickLink
                description="월·주 매출 확인"
                label="매출"
                onPress={() => router.push('/designer/revenue')}
              />
            </View>
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexBasis: '48%',
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  quickLinks: {
    gap: 10,
  },
  quickLink: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickLinkPressed: {
    opacity: 0.88,
  },
  quickLinkBody: {
    flex: 1,
    gap: 4,
  },
  quickLinkLabel: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  quickLinkDescription: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  quickLinkArrow: {
    color: '#FF5A5F',
    fontSize: 22,
    fontWeight: '700',
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
