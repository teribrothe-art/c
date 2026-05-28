import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { VirtualSimulationBanner } from '../components/virtual-simulation-banner';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

export function OrgRevenueOverviewScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary(scope)
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매출을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;
  const revenueBase = scope === 'store' ? '/store/designer' : '/admin/designer';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{scope === 'store' ? '매장 매출' : '본사 매출'}</Text>
        <Text style={styles.subtitle}>디자이너 매출·정산 화면과 동일 데이터를 합산합니다.</Text>

        <VirtualSimulationBanner scenario="weekday" />

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary ? (
          <>
            <View style={styles.grid}>
              <StatCard label="이번 달 매출" value={`${summary.monthRevenue.toLocaleString('ko-KR')}원`} />
              <StatCard
                label="이번 달 시술"
                value={`${summary.monthTreatmentCount.toLocaleString('ko-KR')}건`}
              />
              <StatCard label="정산 대기" value={`${summary.pendingPayoutAmount.toLocaleString('ko-KR')}원`} />
              <StatCard label="연결 고객" value={`${summary.customerCount.toLocaleString('ko-KR')}명`} />
            </View>

            <Text style={styles.sectionTitle}>디자이너별 매출</Text>
            {summary.designers.map((designer) => (
              <Pressable
                key={designer.id}
                onPress={() => router.push(`${revenueBase}/${designer.id}/revenue` as '/store/designer/[designerId]/revenue')}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{designer.name}</Text>
                  <Text style={styles.rowMeta}>
                    {designer.storeName} · {designer.storeRegion}
                  </Text>
                  {designer.subtitle ? <Text style={styles.rowMetaSecondary}>{designer.subtitle}</Text> : null}
                </View>
                <View style={styles.rowStats}>
                  <Text style={styles.rowAmount}>
                    {designer.monthRevenue.toLocaleString('ko-KR')}원
                  </Text>
                  <Text style={styles.rowSub}>
                    시술 {designer.monthTreatmentCount}건 · 고객 {designer.customerCount}명
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      <TabBar />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    minHeight: 88,
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
    fontSize: 18,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  rowMeta: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
  },
  rowMetaSecondary: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  rowStats: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '46%',
  },
  rowAmount: {
    color: colors.mint,
    fontSize: 15,
    fontWeight: '900',
  },
  rowSub: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
