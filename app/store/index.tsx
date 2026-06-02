import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '../../lib/currency-input';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { getOrgStoreForAccountUser } from '../../lib/org-store-affiliation';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import {
  getVirtualStoreForScope,
  type VirtualSimulationScenario,
} from '../../lib/org-virtual-simulation';
import { getCurrentUser } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { OrgDashboardStatGrid } from '../../src/components/org-dashboard-stat-grid';
import { LoadingState } from '../../src/components/loading-state';
import { StoreBottomTabBar } from '../../src/components/store-bottom-tab-bar';
import { VirtualSimulationBanner } from '../../src/components/virtual-simulation-banner';

export default function StoreHomeScreen() {
  useOrgRoleGuard('store');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [scenario, setScenario] = useState<VirtualSimulationScenario>('weekday');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [linkedStoreName, setLinkedStoreName] = useState<string | null>(null);
  const [linkedStoreRegion, setLinkedStoreRegion] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const designersSectionY = useRef(0);

  const load = useCallback(() => {
    setIsLoading(true);

    Promise.all([getCurrentUser(), resolveCurrentStoreOrgId()])
      .then(([user, storeOrgId]) =>
        fetchOrgDashboardSummary('store', {
          storeOrgId,
          scenario,
          withVirtualSimulation: true,
        }).then((data) => ({
          user,
          data,
          storeOrgId,
        })),
      )
      .then(({ user, data, storeOrgId }) => {
        setSummary(data);
        const linkedStore =
          (user ? getOrgStoreForAccountUser(user) : null) ??
          getVirtualStoreForScope('store', storeOrgId);
        setLinkedStoreName(linkedStore?.name ?? null);
        setLinkedStoreRegion(linkedStore?.hotPlace ?? linkedStore?.region ?? null);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매장 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [scenario]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>STORE</Text>
        <Text style={styles.title}>매장</Text>
        <Text style={styles.subtitle}>지역 플랜비 매장과 연동된 디자이너·매출을 확인합니다.</Text>

        <VirtualSimulationBanner scenario={scenario} onScenarioChange={setScenario} />

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <OrgDashboardStatGrid
              items={[
                {
                  key: 'designers',
                  label: '소속 디자이너',
                  value: String(summary.designerCount),
                  onPress: () => {
                    scrollRef.current?.scrollTo({
                      y: Math.max(0, designersSectionY.current - 12),
                      animated: true,
                    });
                  },
                },
                {
                  key: 'treatments',
                  label: '이번 달 시술',
                  value: String(summary.monthTreatmentCount),
                  onPress: () => router.push('/store/customers'),
                },
                {
                  key: 'revenue',
                  label: '이번 달 매출',
                  value: formatAmount(summary.monthRevenue),
                  onPress: () => router.push('/store/revenue'),
                },
                {
                  key: 'customers',
                  label: '연결 고객',
                  value: String(summary.customerCount),
                  onPress: () => router.push('/store/customers'),
                },
              ]}
            />

            {linkedStoreName ? (
              <View style={styles.storeBanner}>
                <Text style={styles.storeBannerLabel}>연결 매장</Text>
                <Text style={styles.storeBannerName}>{linkedStoreName}</Text>
                {linkedStoreRegion ? (
                  <Text style={styles.storeBannerRegion}>{linkedStoreRegion}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.quickRow}>
              <Link href="/store/reservations" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>예약</Text>
                  <Text style={styles.quickMeta}>가입 고객 시술·예약 현황</Text>
                </Pressable>
              </Link>
              <Link href="/store/customers" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>고객</Text>
                  <Text style={styles.quickMeta}>디자이너 고객·시술 연동</Text>
                </Pressable>
              </Link>
              <Link href="/store/revenue" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>매출</Text>
                  <Text style={styles.quickMeta}>매출·정산 합산</Text>
                </Pressable>
              </Link>
            </View>

            <View
              onLayout={(event) => {
                designersSectionY.current = event.nativeEvent.layout.y;
              }}>
              <Text style={styles.sectionTitle}>소속 디자이너</Text>
              {summary.designers.map((designer) => (
                <Pressable
                  key={designer.id}
                  onPress={() => router.push(`/store/designer/${designer.id}/revenue`)}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                  <View>
                    <Text style={styles.menuTitle}>{designer.name}</Text>
                    <Text style={styles.menuMeta}>
                      {designer.storeName} · 고객 {designer.customerCount}명 · 이번 달 시술{' '}
                      {designer.monthTreatmentCount}건
                    </Text>
                  </View>
                  <Text style={styles.menuAmount}>
                    {formatAmount(designer.monthRevenue)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <StoreBottomTabBar />
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
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    color: '#0284C7',
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
  storeBanner: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeBannerLabel: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
  },
  storeBannerName: {
    color: '#0C4A6E',
    fontSize: 18,
    fontWeight: '900',
  },
  storeBannerRegion: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '600',
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
