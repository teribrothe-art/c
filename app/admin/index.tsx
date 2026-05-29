import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildVirtualStoreSummaries } from '../../lib/org-virtual-simulation';
import { buildSimulationStatGridItems } from '../../lib/org-dashboard-stat-items';
import { useOrgDashboardScenario } from '../../lib/use-org-dashboard-scenario';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { OrgDashboardStatGrid } from '../../src/components/org-dashboard-stat-grid';
import { LoadingState } from '../../src/components/loading-state';
import { AdminBottomTabBar } from '../../src/components/admin-bottom-tab-bar';
import { SimulationScenarioPicker } from '../../src/components/simulation-scenario-picker';
import { VirtualSimulationBanner } from '../../src/components/virtual-simulation-banner';

export default function AdminHomeScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
  const { scenario, setScenario, summary, isLoading, errorMessage, reload } =
    useOrgDashboardScenario('admin');
  const virtualStores = useMemo(
    () => (summary ? buildVirtualStoreSummaries(summary) : []),
    [summary],
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const statItems = useMemo(
    () =>
      summary
        ? buildSimulationStatGridItems(summary, {
            onRevenue: () => router.push('/admin/revenue'),
            onTreatments: () => router.push('/admin/customers'),
            onPending: () => router.push('/admin/revenue'),
            onCustomers: () => router.push('/admin/customers'),
          })
        : [],
    [summary],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>ADMIN</Text>
        <Text style={styles.title}>본사</Text>
        <Text style={styles.subtitle}>지역별 핫플레이스 매장과 디자이너 매출·시술 데이터를 함께 봅니다.</Text>

        <VirtualSimulationBanner scenario={scenario} />
        <SimulationScenarioPicker onChange={setScenario} scenario={scenario} />

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <OrgDashboardStatGrid items={statItems} />

            <Text style={styles.sectionTitle}>지역별 핫플레이스</Text>
            {virtualStores.map((store) => {
              const storeDesigners = summary.designers.filter((designer) => designer.storeId === store.id);

              return (
                <View key={store.id} style={styles.virtualStoreRow}>
                  <Text style={styles.virtualStoreName}>{store.name}</Text>
                  <Text style={styles.virtualStoreMeta}>
                    {store.region} · 디자이너 {store.designerCount}명 · 매출{' '}
                    {store.monthRevenue.toLocaleString('ko-KR')}원
                  </Text>
                  <Text style={styles.virtualStoreHotPlace}>{store.hotPlace}</Text>
                  <Text style={styles.virtualStoreDesigners} numberOfLines={2}>
                    {storeDesigners.map((designer) => designer.name).join(' · ') || '연결 디자이너 없음'}
                  </Text>
                </View>
              );
            })}

            <View style={styles.quickRow}>
              <Link href="/admin/simulation" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>시뮬</Text>
                  <Text style={styles.quickMeta}>시나리오 전환</Text>
                </Pressable>
              </Link>
              <Link href="/admin/designers" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>디자이너</Text>
                  <Text style={styles.quickMeta}>소속·누적 테스트 포함</Text>
                </Pressable>
              </Link>
              <Link href="/admin/revenue" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>매출</Text>
                  <Text style={styles.quickMeta}>전체 매출·정산</Text>
                </Pressable>
              </Link>
            </View>

            <Text style={styles.sectionTitle}>매출 상위 디자이너</Text>
            {[...summary.designers]
              .sort((a, b) => b.monthRevenue - a.monthRevenue)
              .slice(0, 5)
              .map((designer) => (
                <Pressable
                  key={designer.id}
                  onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                  <View>
                    <Text style={styles.menuTitle}>{designer.name}</Text>
                    <Text style={styles.menuMeta}>
                      {designer.storeName} · {designer.storeRegion}
                    </Text>
                  </View>
                  <Text style={styles.menuAmount}>
                    {designer.monthRevenue.toLocaleString('ko-KR')}원
                  </Text>
                </Pressable>
              ))}
          </>
        ) : null}
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
    paddingHorizontal: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  virtualStoreRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  virtualStoreName: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  virtualStoreMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  virtualStoreHotPlace: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  virtualStoreDesigners: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  quickPressed: {
    opacity: 0.9,
  },
  quickTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  quickMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  menuRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowPressed: {
    opacity: 0.88,
  },
  menuTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  menuMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  menuAmount: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '900',
  },
});
