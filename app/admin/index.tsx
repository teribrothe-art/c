import { Link, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '../../lib/currency-input';
import { formatDesignerNamePreview } from '../../lib/designer-name-preview';
import {
  canGoToNextMonth,
  canGoToPreviousMonth,
  getCurrentMonthKey,
  shiftMonthKey,
} from '../../lib/designer-revenue-month-nav';
import {
  fetchOrgDashboardSummary,
  formatOrgMonthCaption,
  formatOrgMonthShortLabel,
  type OrgDashboardSummary,
} from '../../lib/org-aggregates';
import { buildVirtualStoreSummaries } from '../../lib/org-virtual-simulation';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { OrgDashboardStatGrid } from '../../src/components/org-dashboard-stat-grid';
import { OrgWeeklySalesPanel } from '../../src/components/org-weekly-sales-panel';
import { LoadingState } from '../../src/components/loading-state';
import { AdminBottomTabBar } from '../../src/components/admin-bottom-tab-bar';
import { HqRevenueSummaryCard } from '../../src/components/hq-revenue-summary-card';
import { RevenuePeriodNavigator } from '../../src/components/revenue-period-navigator';
import { RevenueSplitStructureCard } from '../../src/components/revenue-split-structure-card';

const TOP_DESIGNER_PAGE_SIZE = 5;

export default function AdminHomeScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [virtualStores, setVirtualStores] = useState<ReturnType<typeof buildVirtualStoreSummaries>>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey);
  const [topDesignerPage, setTopDesignerPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const monthCaption = useMemo(() => formatOrgMonthCaption(selectedMonthKey), [selectedMonthKey]);
  const monthShortLabel = useMemo(
    () => formatOrgMonthShortLabel(selectedMonthKey),
    [selectedMonthKey],
  );

  const rankedDesigners = useMemo(
    () => (summary ? [...summary.designers].sort((a, b) => b.monthGrossSales - a.monthGrossSales) : []),
    [summary],
  );

  const totalTopDesignerPages = useMemo(
    () => Math.max(1, Math.ceil(rankedDesigners.length / TOP_DESIGNER_PAGE_SIZE)),
    [rankedDesigners.length],
  );

  const visibleTopDesigners = useMemo(() => {
    const start = topDesignerPage * TOP_DESIGNER_PAGE_SIZE;

    return rankedDesigners.slice(start, start + TOP_DESIGNER_PAGE_SIZE);
  }, [rankedDesigners, topDesignerPage]);

  useEffect(() => {
    setTopDesignerPage(0);
  }, [selectedMonthKey]);

  useEffect(() => {
    if (topDesignerPage > totalTopDesignerPages - 1) {
      setTopDesignerPage(Math.max(0, totalTopDesignerPages - 1));
    }
  }, [topDesignerPage, totalTopDesignerPages]);

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary('admin', {
      monthKey: selectedMonthKey,
      withVirtualSimulation: false,
    })
      .then((data) => {
        setSummary(data);
        setVirtualStores(buildVirtualStoreSummaries(data));
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '본사 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [selectedMonthKey]);

  const handlePreviousMonth = useCallback(() => {
    if (!canGoToPreviousMonth(selectedMonthKey)) {
      return;
    }

    setSelectedMonthKey(shiftMonthKey(selectedMonthKey, -1));
  }, [selectedMonthKey]);

  const handleNextMonth = useCallback(() => {
    if (!canGoToNextMonth(selectedMonthKey)) {
      return;
    }

    setSelectedMonthKey(shiftMonthKey(selectedMonthKey, 1));
  }, [selectedMonthKey]);

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
        <Text style={styles.badge}>ADMIN</Text>
        <Text style={styles.title}>본사</Text>
        <Text style={styles.subtitle}>
          {monthShortLabel} 총매출은 해당 월 결제 합계이며, 평일·주말 탭에서 주간 날짜별 매출을 확인할 수
          있습니다.
        </Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <HqRevenueSummaryCard
              canNextMonth={canGoToNextMonth(selectedMonthKey)}
              canPreviousMonth={canGoToPreviousMonth(selectedMonthKey)}
              editable
              monthCaption={monthCaption}
              onHqRateApplied={load}
              onNextMonth={handleNextMonth}
              onPreviousMonth={handlePreviousMonth}
              totals={summary}
            />

            <RevenueSplitStructureCard
              sampleCaption={`${monthCaption} 총매출 기준`}
              sampleGrossAmount={summary.monthGrossSales || 100_000}
            />

            <OrgWeeklySalesPanel monthKey={selectedMonthKey} scope="admin" />

            <OrgDashboardStatGrid
              items={[
                {
                  key: 'gross',
                  label: `${monthShortLabel} 매출`,
                  value: formatAmount(summary.monthGrossSales),
                  meta: '시술 결제 총액',
                  onPress: () => router.push('/admin/revenue' as Href),
                },
                {
                  key: 'hq-revenue',
                  label: '본사 수익',
                  value: formatAmount(summary.monthHqRevenue),
                  meta: `수익률 ${summary.hqYieldRate}%`,
                  onPress: () => router.push('/admin/revenue-split'),
                },
                {
                  key: 'treatments',
                  label: `${monthShortLabel} 시술`,
                  value: String(summary.monthTreatmentCount),
                  onPress: () => router.push('/admin/customers'),
                },
                {
                  key: 'designers',
                  label: '연결 디자이너',
                  value: String(summary.designerCount),
                  onPress: () => router.push('/admin/designers'),
                },
              ]}
            />

            <Text style={styles.sectionTitle}>지역별 플랜비</Text>
            {virtualStores.map((store) => {
              const storeDesigners = summary.designers.filter((designer) => designer.storeId === store.id);

              return (
                <View key={store.id} style={styles.virtualStoreRow}>
                  <Text style={styles.virtualStoreName}>{store.name}</Text>
                  <Text style={styles.virtualStoreMeta}>
                    {store.region} · 디자이너 {store.designerCount}명 · 매출{' '}
                    {formatAmount(store.monthGrossSales)} · 본사{' '}
                    {formatAmount(store.monthHqRevenue)}
                  </Text>
                  <Text style={styles.virtualStoreHotPlace}>{store.hotPlace}</Text>
                  <Text style={styles.virtualStoreDesigners} numberOfLines={1}>
                    {formatDesignerNamePreview(storeDesigners.map((designer) => designer.name))}
                  </Text>
                </View>
              );
            })}

            <View style={styles.quickRow}>
              <Link href={'/admin/reservations' as Href} asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>예약</Text>
                  <Text style={styles.quickMeta}>가입 고객 시술·예약 현황</Text>
                </Pressable>
              </Link>
              <Link href="/admin/designers" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>매장</Text>
                  <Text style={styles.quickMeta}>소속·누적 테스트 포함</Text>
                </Pressable>
              </Link>
              <Link href={'/admin/revenue' as Href} asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>매출</Text>
                  <Text style={styles.quickMeta}>전체 매출·정산</Text>
                </Pressable>
              </Link>
              <Link href="/admin/revenue-split" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>수수료</Text>
                  <Text style={styles.quickMeta}>구조·상호 승인</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.topDesignerSection}>
              <View style={styles.topDesignerHeader}>
                <Text style={[styles.sectionTitle, styles.topDesignerSectionTitle]}>매출 상위 디자이너</Text>
                {rankedDesigners.length > TOP_DESIGNER_PAGE_SIZE ? (
                  <View style={styles.topDesignerNav}>
                    <RevenuePeriodNavigator
                      canNext={topDesignerPage < totalTopDesignerPages - 1}
                      canPrevious={topDesignerPage > 0}
                      label={`${topDesignerPage + 1} / ${totalTopDesignerPages}`}
                      onNext={() => setTopDesignerPage((page) => page + 1)}
                      onPrevious={() => setTopDesignerPage((page) => page - 1)}
                    />
                  </View>
                ) : null}
              </View>
              {visibleTopDesigners.map((designer, index) => {
                const rank = topDesignerPage * TOP_DESIGNER_PAGE_SIZE + index + 1;

                return (
                  <Pressable
                    key={designer.id}
                    onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
                    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                    <View style={styles.menuRowBody}>
                      <Text style={styles.menuRank}>{rank}위</Text>
                      <View style={styles.menuTextBlock}>
                        <Text style={styles.menuTitle}>{designer.name}</Text>
                        <Text style={styles.menuMeta}>
                          {designer.storeName} · {designer.storeRegion}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.menuAmount}>{formatAmount(designer.monthGrossSales)}</Text>
                  </Pressable>
                );
              })}
            </View>
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
  topDesignerSection: {
    gap: 10,
    marginBottom: 10,
  },
  topDesignerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  topDesignerSectionTitle: {
    flex: 1,
    marginBottom: 0,
  },
  topDesignerNav: {
    flexShrink: 0,
    width: 132,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBody: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  menuRank: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 28,
  },
  menuTextBlock: {
    flex: 1,
    minWidth: 0,
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
