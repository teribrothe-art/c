import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { formatPlainAmount, formatSalesAmount } from '../../lib/currency-input';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import {
  fetchOrgMonthlySalesCatalog,
  fetchOrgMonthlySalesSummary,
  filterMonthlyCatalogByQuery,
  type OrgMonthlySalesCatalogItem,
  type OrgMonthlySalesSummary,
} from '../../lib/org-monthly-sales';
import {
  fetchOrgWeeklySalesSummary,
  type OrgWeeklySalesSummary,
  type WeeklySalesSegment,
} from '../../lib/org-weekly-sales';
import { getWeekStartMonday, toLocalDateString } from '../../lib/designer-revenue-weekly';
import { formatMonthKeyLabel, formatThisMonthScopedLabel } from '../../lib/designer-revenue-analytics';
import { getErrorMessage } from '../../lib/errors';
import {
  settlementTotalsForSalesContext,
  sumMonthlyGrossSales,
} from '../../lib/org-sales-display';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { HqRevenueSummaryCard } from '../components/hq-revenue-summary-card';
import {
  DesignerRegionFilterTabBar,
} from '../components/designer-region-filter-tab-bar';
import {
  WeeklySalesTabBar,
  type SalesFilterContext,
  type SalesPeriodMode,
} from '../components/weekly-sales-tab-bar';
import {
  designerMatchesRegionFilter,
  type DesignerRegionFilterKey,
} from '../../lib/designer-region-filter';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
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

  if (tab === 'sales') {
    return formatSalesAmount(getDesignerMetricValue(designer, tab, scope));
  }

  return formatPlainAmount(getDesignerMetricValue(designer, tab, scope));
}

function getSectionTitle(tab: RevenueMetricTab, scope: OrgScope, monthScopeLabel: string) {
  if (scope === 'store') {
    switch (tab) {
      case 'payout':
        return `${monthScopeLabel} 디자이너별 정산`;
      case 'treatments':
        return `${monthScopeLabel} 디자이너별 시술`;
      case 'pending':
        return '디자이너별 정산 대기';
      default:
        return `${monthScopeLabel} 디자이너별 매출`;
    }
  }

  switch (tab) {
    case 'sales':
      return `${monthScopeLabel} 디자이너별 매출`;
    case 'hq':
      return `${monthScopeLabel} 디자이너별 본사 수익`;
    case 'treatments':
      return `${monthScopeLabel} 디자이너별 시술`;
    case 'pending':
      return '디자이너별 정산 대기';
    default:
      return `${monthScopeLabel} 디자이너별 매출`;
  }
}

export function OrgRevenueOverviewScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const { q, region } = useLocalSearchParams<{ q?: string; region?: string }>();
  const initialQuery = typeof q === 'string' ? q : '';
  const initialRegionKey = typeof region === 'string' ? (region as DesignerRegionFilterKey) : 'all';
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [weeklySales, setWeeklySales] = useState<OrgWeeklySalesSummary | null>(null);
  const [weeklySegment, setWeeklySegment] = useState<WeeklySalesSegment>('weekday');
  const maxWeekStart = useMemo(() => getWeekStartMonday(toLocalDateString(new Date())), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState(maxWeekStart);
  const [periodMode, setPeriodMode] = useState<SalesPeriodMode>('weekly');
  const [monthlyCatalog, setMonthlyCatalog] = useState<OrgMonthlySalesCatalogItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<OrgMonthlySalesSummary | null>(null);
  const [monthSearchQuery, setMonthSearchQuery] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [regionFilterKey, setRegionFilterKey] = useState<DesignerRegionFilterKey>(initialRegionKey);
  const [metricTab, setMetricTab] = useState<RevenueMetricTab>(
    scope === 'admin' ? 'sales' : 'payout',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [salesFilterContext, setSalesFilterContext] = useState<SalesFilterContext | null>(null);

  const hqCardTotals = useMemo(() => {
    if (!summary || scope !== 'admin') {
      return null;
    }

    return (
      settlementTotalsForSalesContext(salesFilterContext, summary.configuredHqRate) ?? summary
    );
  }, [salesFilterContext, scope, summary]);

  const monthGrossSales = useMemo(
    () => sumMonthlyGrossSales(monthlySummary, summary?.monthGrossSales ?? 0),
    [monthlySummary, summary?.monthGrossSales],
  );

  const isCurrentMonth = selectedMonthKey === new Date().toISOString().slice(0, 7);

  const loadSummary = useCallback(() => {
    setIsLoading(true);

    return Promise.all([
      fetchOrgDashboardSummary(scope, { monthKey: selectedMonthKey }),
      fetchOrgWeeklySalesSummary(scope, { referenceDate: selectedWeekStart }),
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
  }, [scope, selectedMonthKey, selectedWeekStart]);

  const handleSelectMonth = useCallback((monthKey: string) => {
    setSelectedMonthKey(monthKey);

    void fetchOrgMonthlySalesSummary(scope, monthKey).then(setMonthlySummary);
  }, [scope]);

  const handleSelectWeekStart = useCallback(
    (weekStart: string) => {
      setSelectedWeekStart(weekStart);
      void fetchOrgWeeklySalesSummary(scope, { referenceDate: weekStart }).then(setWeeklySales);
    },
    [scope],
  );

  const filteredMonthlyCatalog = useMemo(
    () => filterMonthlyCatalogByQuery(monthlyCatalog, monthSearchQuery),
    [monthlyCatalog, monthSearchQuery],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }

    if (initialRegionKey && initialRegionKey !== 'all') {
      setRegionFilterKey(initialRegionKey);
    }
  }, [initialQuery, initialRegionKey]);

  useEffect(() => {
    void fetchOrgMonthlySalesSummary(scope, selectedMonthKey).then(setMonthlySummary);
  }, [scope, selectedMonthKey]);

  useEffect(() => {
    if (periodMode !== 'monthly') {
      return;
    }

    if (monthlyCatalog.length === 0) {
      void fetchOrgMonthlySalesCatalog(scope).then(setMonthlyCatalog);
    }
  }, [monthlyCatalog.length, periodMode, scope]);

  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;
  const revenueBase = scope === 'store' ? '/store/designer' : '/admin/designer';

  const visibleDesigners = useMemo(() => {
    if (!summary) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    let rows = summary.designers;

    if (regionFilterKey !== 'all') {
      rows = rows.filter((designer) => designerMatchesRegionFilter(designer, regionFilterKey));
    }

    if (query) {
      rows = rows.filter((designer) =>
        [designer.name, designer.storeName, designer.storeRegion, designer.subtitle ?? '', designer.email]
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }

    return [...rows]
      .sort(
        (a, b) => getDesignerMetricValue(b, metricTab, scope) - getDesignerMetricValue(a, metricTab, scope),
      )
      .slice(0, 80);
  }, [metricTab, regionFilterKey, scope, searchQuery, summary]);

  const monthLabel = formatMonthKeyLabel(selectedMonthKey);
  const monthScopeLabel = isCurrentMonth ? formatThisMonthScopedLabel() : monthLabel;

  const adminMetricTabs: { key: AdminRevenueMetricTab; label: string; value: string }[] = summary
    ? [
        {
          key: 'sales',
          label: `${monthScopeLabel} 매출`,
          value: formatSalesAmount(monthGrossSales),
        },
        { key: 'hq', label: '본사 수익', value: formatPlainAmount(summary.monthHqRevenue) },
        {
          key: 'treatments',
          label: `${monthScopeLabel} 시술`,
          value: `${summary.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        },
        { key: 'pending', label: '정산 대기', value: formatPlainAmount(summary.pendingPayoutAmount) },
      ]
    : [];

  const storeMetricTabs: { key: StoreRevenueMetricTab; label: string; value: string }[] = summary
    ? [
        { key: 'payout', label: `${monthScopeLabel} 정산`, value: formatPlainAmount(summary.monthDesignerPayout) },
        {
          key: 'treatments',
          label: `${monthScopeLabel} 시술`,
          value: `${summary.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        },
        { key: 'pending', label: '정산 대기', value: formatPlainAmount(summary.pendingPayoutAmount) },
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ 전단계</Text>
        </Pressable>
        <Text style={styles.title}>{scope === 'store' ? '매장 매출' : '본사 매출'}</Text>
        <Text style={styles.subtitle}>
          {scope === 'admin'
            ? '총 매출과 수수료 구조에 따른 본사·디자이너·매장 분배를 함께 봅니다.'
            : '디자이너 매출·정산 화면과 동일 데이터를 합산합니다.'}
        </Text>

        {weeklySales ? (
          <WeeklySalesTabBar
            monthSearchQuery={monthSearchQuery}
            monthlyCatalog={filteredMonthlyCatalog}
            monthlySummary={monthlySummary}
            onMonthSearchQueryChange={setMonthSearchQuery}
            onPeriodModeChange={setPeriodMode}
            onSalesFilterContextChange={setSalesFilterContext}
            onSelectMonthKey={handleSelectMonth}
            onSelectWeekStart={handleSelectWeekStart}
            onWeeklySegmentChange={setWeeklySegment}
            periodMode={periodMode}
            scope={scope}
            selectedMonthKey={selectedMonthKey}
            selectedWeekStart={selectedWeekStart}
            maxWeekStart={maxWeekStart}
            weeklySegment={weeklySegment}
            weeklySummary={weeklySales}
          />
        ) : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary ? (
          <>
            {scope === 'admin' && hqCardTotals ? (
              <HqRevenueSummaryCard
                hideMonthChips
                periodLabel={salesFilterContext?.titleLabel}
                totals={hqCardTotals}
              />
            ) : null}

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

            <Text style={styles.sectionTitle}>{getSectionTitle(metricTab, scope, monthScopeLabel)}</Text>
            <DesignerRegionFilterTabBar activeKey={regionFilterKey} onSelect={setRegionFilterKey} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="디자이너·매장·지역 검색"
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
  backRow: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
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
