import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildSimulationStatGridItems } from '../../lib/org-dashboard-stat-items';
import { getOrgStoreById } from '../../lib/org-store-affiliation';
import { useOrgDashboardScenario } from '../../lib/use-org-dashboard-scenario';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { OrgDashboardStatGrid } from '../components/org-dashboard-stat-grid';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { LoadingState } from '../components/loading-state';
import { EmptyState } from '../components/empty-state';

export function OrgStoreDetailScreen() {
  useOrgRoleGuard('admin');
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const insets = useSafeAreaInsets();
  const store = storeId ? getOrgStoreById(storeId) : undefined;
  const { summary, isLoading, errorMessage, reload } = useOrgDashboardScenario('admin');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const storeSummary = useMemo(() => {
    if (!summary || !store) {
      return null;
    }

    const designers = summary.designers.filter((designer) => designer.storeId === store.id);

    if (designers.length === 0) {
      return null;
    }

    return {
      designerCount: designers.length,
      customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
      monthRevenue: designers.reduce((sum, item) => sum + item.monthRevenue, 0),
      monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
      pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
      designers,
    };
  }, [store, summary]);

  const statItems = useMemo(
    () =>
      storeSummary
        ? buildSimulationStatGridItems(storeSummary, {
            onRevenue: () => router.push('/admin/revenue'),
            onTreatments: () => router.push('/admin/customers'),
            onPending: () => router.push('/admin/revenue'),
            onCustomers: () => router.push('/admin/customers'),
          })
        : [],
    [storeSummary],
  );

  if (!store) {
    return (
      <View style={styles.container}>
        <EmptyState title="매장을 찾을 수 없습니다" subtitle="목록에서 다시 선택해주세요." />
        <AdminBottomTabBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ 본사</Text>
        </Pressable>

        <Text style={styles.title}>{store.name}</Text>
        <Text style={styles.subtitle}>
          {store.region} · {store.hotPlace}
        </Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : storeSummary ? (
          <>
            <OrgDashboardStatGrid items={statItems} />

            <Text style={styles.sectionTitle}>소속 디자이너</Text>
            {storeSummary.designers.map((designer) => (
              <Pressable
                key={designer.id}
                onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
                style={({ pressed }) => [styles.designerRow, pressed && styles.designerRowPressed]}>
                <View style={styles.designerBody}>
                  <Text style={styles.designerName}>{designer.name}</Text>
                  <Text style={styles.designerMeta}>
                    고객 {designer.customerCount}명 · 이번 달 시술 {designer.monthTreatmentCount}건
                  </Text>
                </View>
                <Text style={styles.designerAmount}>
                  {designer.monthRevenue.toLocaleString('ko-KR')}원
                </Text>
              </Pressable>
            ))}
          </>
        ) : (
          <EmptyState title="디자이너 없음" subtitle="이 매장에 연결된 디자이너가 없습니다." />
        )}
      </ScrollView>
      <AdminBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 12,
    paddingHorizontal: 18,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backLinkText: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  designerRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  designerRowPressed: {
    opacity: 0.88,
  },
  designerBody: {
    flex: 1,
    gap: 4,
  },
  designerName: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  designerMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  designerAmount: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '900',
  },
});
