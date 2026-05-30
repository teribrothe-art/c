import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { formatAmount } from '../../lib/currency-input';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import {
  fetchOrgWeeklySalesSummary,
  type OrgWeeklySalesSummary,
  type WeeklySalesSegment,
} from '../../lib/org-weekly-sales';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { HqRevenueSummaryCard } from '../components/hq-revenue-summary-card';
import { WeeklySalesTabBar } from '../components/weekly-sales-tab-bar';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { AdminSectionTabBar } from '../components/admin-section-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

type AdminRevenueMetricTab = 'sales' | 'hq' | 'treatments' | 'pending';
type StoreRevenueMetricTab = 'payout' | 'treatments' | 'pending';
type RevenueMetricTab = AdminRevenueMetricTab | StoreRevenueMetricTab;

function getDesignerMetricValue(
  designer: OrgDashboardSummary['designers'][number],
  tab: RevenueMetricTab,
  scope: OrgScope,
) {
  switch (tab) {
    case 'hq':
      return designer.monthHqRevenue;
    case 'treatments':
      return designer.monthTreatmentCount;
    case 'pending':
      return designer.pendingPayoutAmount;
    case 'payout':
      return designer.monthDesignerPayout;
    case 'sales':
    default:
      return scope === 'admin' ? designer.monthGrossSales : designer.monthDesignerPayout;
  }
}

function formatDesignerMetricValue(
  designer: OrgDashboardSummary['designers'][number],
  tab: RevenueMetricTab,
  scope: OrgScope,
) {
  if (tab === 'treatments') {
    return `${designer.monthTreatmentCount.toLocaleString('ko-KR')}건`;
  }

  return formatAmount(getDesignerMetricValue(designer, tab, scope));
}

function getSectionTitle(tab: RevenueMetricTab, scope: OrgScope) {
  if (scope === 'store') {
    switch (tab) {
      case 'payout':
        return '디자이너별 정산';
      case 'treatments':
        return '디자이너별 시술';
      case 'pending':
        return '디자이너별 정산 대기';
      default:
        return '디자이너별 매출';
    }
  }

  switch (tab) {
    case 'sales':
      return '디자이너별 매출';
    case 'hq':
      return '디자이너별 본사 수익';
    case 'treatments':
      return '디자이너별 시술';
    case 'pending':
      return '디자이너별 정산 대기';
    default:
      return '디자이너별 매출';
  }
}

export function OrgRevenueOverviewScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [weeklySales, setWeeklySales] = useState<OrgWeeklySalesSummary | null>(null);
  const [weeklySegment, setWeeklySegment] = useState<WeeklySalesSegment>('weekday');
  const [searchQuery, setSearchQuery] = useState('');
  const [metricTab, setMetricTab] = useState<RevenueMetricTab>(
    scope === 'admin' ? 'sales' : 'payout',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    Promise.all([
      fetchOrgDashboardSummary(scope),
      fetchOrgWeeklySalesSummary(scope),
    ])
      .then(([data, weekData]) => {
        setSummary(data);
        setWeeklySales(weekData);
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

  const visibleDesigners = useMemo(() => {
    if (!summary) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    let rows = summary.designers;

    if (query) {
      rows = rows.filter((designer) =>
        [designer.name, designer.storeName, designer.storeRegion, designer.subtitle ?? '', designer.email]
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }

    return [...rows].sort(
      (a, b) => getDesignerMetricValue(b, metricTab, scope) - getDesignerMetricValue(a, metricTab, scope),
    );
  }, [metricTab, scope, searchQuery, summary]);

  const adminMetricTabs: { key: AdminRevenueMetricTab; label: string; value: string }[] = summary
    ? [
        { key: 'sales', label: '이번 달 매출', value: formatAmount(summary.monthGrossSales) },
        { key: 'hq', label: '본사 수익', value: formatAmount(summary.monthHqRevenue) },
        {
          key: 'treatments',
          label: '이번 달 시술',
          value: `${summary.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        },
        { key: 'pending', label: '정산 대기', value: formatAmount(summary.pendingPayoutAmount) },
      ]
    : [];

  const storeMetricTabs: { key: StoreRevenueMetricTab; label: string; value: string }[] = summary
    ? [
        { key: 'payout', label: '이번 달 정산', value: formatAmount(summary.monthDesignerPayout) },
        {
          key: 'treatments',
          label: '이번 달 시술',
          value: `${summary.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        },
        { key: 'pending', label: '정산 대기', value: formatAmount(summary.pendingPayoutAmount) },
      ]
    : [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{scope === 'store' ? '매장 매출' : '본사 매출'}</Text>
        <Text style={styles.subtitle}>
          {scope === 'admin'
            ? '총 매출과 수수료 구조에 따른 본사·디자이너·매장 분배를 함께 봅니다.'
            : '디자이너 매출·정산 화면과 동일 데이터를 합산합니다.'}
        </Text>

        {weeklySales ? (
          <WeeklySalesTabBar
            segment={weeklySegment}
            summary={weeklySales}
            onSegmentChange={setWeeklySegment}
          />
        ) : null}

        {scope === 'admin' ? <AdminSectionTabBar /> : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary ? (
          <>
            {scope === 'admin' ? <HqRevenueSummaryCard totals={summary} /> : null}

            <View style={styles.grid}>
              {(scope === 'admin' ? adminMetricTabs : storeMetricTabs).map((tab) => (
                <StatTabCard
                  key={tab.key}
                  label={tab.label}
                  selected={metricTab === tab.key}
                  value={tab.value}
                  onPress={() => setMetricTab(tab.key)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>{getSectionTitle(metricTab, scope)}</Text>
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="디자이너·매장 검색"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
            />
            {visibleDesigners.length === 0 ? (
              <EmptyState
                title="검색 결과 없음"
                subtitle={searchQuery.trim() ? `"${searchQuery.trim()}"에 맞는 디자이너가 없습니다.` : '표시할 디자이너가 없습니다.'}
              />
            ) : (
              visibleDesigners.map((designer) => (
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
                      {formatDesignerMetricValue(designer, metricTab, scope)}
                    </Text>
                    <Text style={styles.rowSub}>
                      시술 {designer.monthTreatmentCount}건 · 고객 {designer.customerCount}명
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
      <TabBar />
    </View>
  );
}

function StatTabCard({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        selected && styles.statCardSelected,
        pressed && styles.statCardPressed,
      ]}>
      <Text style={[styles.statLabel, selected && styles.statLabelSelected]}>{label}</Text>
      <Text style={[styles.statValue, selected && styles.statValueSelected]}>{value}</Text>
    </Pressable>
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
  statCardSelected: {
    backgroundColor: '#F7F4FF',
    borderColor: colors.purple,
  },
  statCardPressed: {
    opacity: 0.92,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statLabelSelected: {
    color: colors.purple,
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
  },
  statValueSelected: {
    color: colors.purple,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
