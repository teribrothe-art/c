import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { getVirtualStoreForScope } from '../../lib/org-virtual-simulation';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { LoadingState } from '../../src/components/loading-state';
import { StoreBottomTabBar } from '../../src/components/store-bottom-tab-bar';
import { VirtualSimulationBanner } from '../../src/components/virtual-simulation-banner';

export default function StoreHomeScreen() {
  useOrgRoleGuard('store');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary('store')
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매장 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>STORE</Text>
        <Text style={styles.title}>매장</Text>
        <Text style={styles.subtitle}>가상 시뮬레이션과 연동된 매장 운영 화면입니다.</Text>

        <VirtualSimulationBanner scenario="weekday" />

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <View style={styles.cardGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>소속 디자이너</Text>
                <Text style={styles.statValue}>{summary.designerCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>이번 달 시술</Text>
                <Text style={styles.statValue}>{summary.monthTreatmentCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>이번 달 매출</Text>
                <Text style={styles.statValue}>{summary.monthRevenue.toLocaleString('ko-KR')}</Text>
                <Text style={styles.statMeta}>원</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>연결 고객</Text>
                <Text style={styles.statValue}>{summary.customerCount}</Text>
              </View>
            </View>

            {getVirtualStoreForScope('store') ? (
              <Text style={styles.storeHint}>
                {getVirtualStoreForScope('store')?.name} · {getVirtualStoreForScope('store')?.region}
              </Text>
            ) : null}

            <View style={styles.quickRow}>
              <Link href="/store/simulation" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>시뮬</Text>
                  <Text style={styles.quickMeta}>시나리오·타임라인</Text>
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

            <Text style={styles.sectionTitle}>소속 디자이너</Text>
            {summary.designers.map((designer) => (
              <Pressable
                key={designer.id}
                onPress={() => router.push(`/store/designer/${designer.id}/revenue`)}
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                <View>
                  <Text style={styles.menuTitle}>{designer.name}</Text>
                  <Text style={styles.menuMeta}>
                    고객 {designer.customerCount}명 · 이번 달 시술 {designer.monthTreatmentCount}건
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 96,
    padding: 14,
    width: '48%',
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  statMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  storeHint: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
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
