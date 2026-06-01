import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatSalesAmount } from '../../lib/currency-input';
import { formatMonthKeyLabel, formatThisMonthScopedLabel } from '../../lib/designer-revenue-analytics';
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
import { buildVirtualStoreSummaries } from '../../lib/org-virtual-simulation';
import { getErrorMessage } from '../../lib/errors';
import {
  settlementTotalsForSalesContext,
  sumMonthlyGrossSales,
  sumWeeklyGrossSales,
} from '../../lib/org-sales-display';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { OrgDashboardStatGrid } from '../../src/components/org-dashboard-stat-grid';
import { LoadingState } from '../../src/components/loading-state';
import { AdminBottomTabBar } from '../../src/components/admin-bottom-tab-bar';
import { HqRevenueSummaryCard } from '../../src/components/hq-revenue-summary-card';
import { RevenueSplitStructureCard } from '../../src/components/revenue-split-structure-card';
import { TopStoresSection } from '../../src/components/top-stores-section';
import {
  WeeklySalesTabBar,
  type SalesFilterContext,
  type SalesPeriodMode,
} from '../../src/components/weekly-sales-tab-bar';

export default function AdminHomeScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [weeklySales, setWeeklySales] = useState<OrgWeeklySalesSummary | null>(null);
  const [weeklySegment, setWeeklySegment] = useState<WeeklySalesSegment>('weekday');
  const [periodMode, setPeriodMode] = useState<SalesPeriodMode>('weekly');
  const [monthlyCatalog, setMonthlyCatalog] = useState<OrgMonthlySalesCatalogItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<OrgMonthlySalesSummary | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [monthSearchQuery, setMonthSearchQuery] = useState('');
  const [virtualStores, setVirtualStores] = useState<ReturnType<typeof buildVirtualStoreSummaries>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [salesFilterContext, setSalesFilterContext] = useState<SalesFilterContext | null>(null);

  const hqCardTotals = useMemo(() => {
    if (!summary) {
      return null;
    }

    return (
      settlementTotalsForSalesContext(salesFilterContext, summary.configuredHqRate) ?? summary
    );
  }, [salesFilterContext, summary]);

  const weeklyGrossSales = useMemo(
    () => (weeklySales ? sumWeeklyGrossSales(weeklySales) : 0),
    [weeklySales],
  );

  const monthGrossSales = useMemo(
    () => sumMonthlyGrossSales(monthlySummary, summary?.monthGrossSales ?? 0),
    [monthlySummary, summary?.monthGrossSales],
  );

  const monthScopeLabel = useMemo(() => {
    if (monthlySummary?.monthLabel) {
      return monthlySummary.monthLabel;
    }

    return formatMonthKeyLabel(selectedMonthKey);
  }, [monthlySummary?.monthLabel, selectedMonthKey]);

  const load = useCallback(() => {
    setIsLoading(true);

    Promise.all([fetchOrgDashboardSummary('admin'), fetchOrgWeeklySalesSummary('admin')])
      .then(([data, weekData]) => {
        setSummary(data);
        setWeeklySales(weekData);
        setVirtualStores(buildVirtualStoreSummaries(data));
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '본사 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    void fetchOrgMonthlySalesSummary('admin', selectedMonthKey).then(setMonthlySummary);
  }, [selectedMonthKey]);

  useEffect(() => {
    if (periodMode !== 'monthly') {
      return;
    }

    if (monthlyCatalog.length === 0) {
      void fetchOrgMonthlySalesCatalog('admin').then(setMonthlyCatalog);
    }
  }, [monthlyCatalog.length, periodMode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredMonthlyCatalog = useMemo(
    () => filterMonthlyCatalogByQuery(monthlyCatalog, monthSearchQuery),
    [monthlyCatalog, monthSearchQuery],
  );

  const handleSelectMonthKey = useCallback((monthKey: string) => {
    setSelectedMonthKey(monthKey);

    void fetchOrgMonthlySalesSummary('admin', monthKey).then(setMonthlySummary);
  }, []);

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
        <Text style={styles.subtitle}>
          등록된 디자이너·시술·매출을 불러오고, 이번 주 평일·주말 매출을 함께 확인합니다.
        </Text>

        {weeklySales ? (
          <WeeklySalesTabBar
            monthSearchQuery={monthSearchQuery}
            monthlyCatalog={filteredMonthlyCatalog}
            monthlySummary={monthlySummary}
            onMonthSearchQueryChange={setMonthSearchQuery}
            onPeriodModeChange={setPeriodMode}
            onSalesFilterContextChange={setSalesFilterContext}
            onSelectMonthKey={handleSelectMonthKey}
            onWeeklySegmentChange={setWeeklySegment}
            periodMode={periodMode}
            scope="admin"
            selectedMonthKey={selectedMonthKey}
            weeklySegment={weeklySegment}
            weeklySummary={weeklySales}
          />
        ) : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <RevenueSplitStructureCard sampleGrossAmount={summary.monthGrossSales || 100_000} />
            <HqRevenueSummaryCard
              hideMonthChips
              periodLabel={salesFilterContext?.titleLabel}
              totals={hqCardTotals ?? summary}
            />

            <OrgDashboardStatGrid
              items={[
                {
                  key: 'week-gross',
                  label: '이번 주 매출',
                  value: formatSalesAmount(weeklyGrossSales),
                  meta: weeklySales?.weekLabel ?? '주간 합계',
                  onPress: () => router.push('/admin/revenue' as Href),
                },
                {
                  key: 'gross',
                  label: `${monthScopeLabel} 매출`,
                  value: formatSalesAmount(monthGrossSales),
                  meta: '월간 시술 결제 총액',
                  onPress: () => router.push('/admin/revenue' as Href),
                },
                {
                  key: 'treatments',
                  label: `${monthScopeLabel} 시술`,
                  value: summary.monthTreatmentCount.toLocaleString('ko-KR'),
                  onPress: () => router.push('/admin/customers'),
                },
                {
                  key: 'designers',
                  label: '연결 디자이너',
                  value: summary.designerCount.toLocaleString('ko-KR'),
                  onPress: () => router.push('/admin/designers'),
                },
              ]}
            />

            <TopStoresSection designers={summary.designers} virtualStores={virtualStores} />

            <Text style={styles.sectionTitle}>매출 상위 디자이너</Text>
            {[...summary.designers]
              .sort((a, b) => b.monthGrossSales - a.monthGrossSales)
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
                    {formatSalesAmount(designer.monthGrossSales)}
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
