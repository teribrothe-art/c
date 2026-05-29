import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchDesignerRevenueAnalytics,
  type DesignerRevenueAnalytics,
  type WeekdayRevenueCell,
} from '../../lib/designer-revenue-analytics';
import { getErrorMessage } from '../../lib/errors';
import { RevenueBarChart } from '../../src/components/revenue-bar-chart';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { RevenueMetricsChart } from '../../src/components/revenue-metrics-chart';
import { RevenueScopeTabs, type RevenueScopeTab } from '../../src/components/revenue-scope-tabs';
import { WeeklyRevenuePanel } from '../../src/components/weekly-revenue-panel';
import { SettlementWeekDayTabs } from '../../src/components/settlement-week-day-tabs';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

function formatKoreanMonthDayWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdayKanji = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

  return `${month}월 ${day}일 ${weekdayKanji}요일`;
}

export default function DesignerRevenueScreen() {
  const insets = useSafeAreaInsets();
  const { month: monthParam } = useLocalSearchParams<{ month?: string }>();
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>(undefined);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | undefined>(undefined);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [scopeTab, setScopeTab] = useState<RevenueScopeTab>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const selectedMonthKeyRef = useRef<string | undefined>(undefined);
  const selectedWeekKeyRef = useRef<string | undefined>(undefined);
  const routeMonthHandledRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  selectedMonthKeyRef.current = selectedMonthKey;
  selectedWeekKeyRef.current = selectedWeekKey;

  const loadRevenue = useCallback((monthKey?: string, weekKey?: string) => {
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }

    fetchDesignerRevenueAnalytics(monthKey, weekKey)
      .then((data) => {
        setAnalytics(data);
        setSelectedMonthKey(data.selectedMonthKey);
        setSelectedWeekKey(data.selectedWeekKey);
        setSelectedDayDate((prev) => {
          if (prev && data.selectedWeek.days.some((day) => day.date === prev)) {
            return prev;
          }

          const todayInWeek = data.selectedWeek.days.find((day) => day.isToday);

          if (todayInWeek) {
            return todayInWeek.date;
          }

          const withRevenue = data.selectedWeek.days.find((day) => day.totalAmount > 0);

          return withRevenue?.date ?? data.selectedWeek.days[0]?.date ?? null;
        });
        setErrorMessage('');
        hasLoadedOnceRef.current = true;
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매출 데이터를 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const monthFromRoute = typeof monthParam === 'string' ? monthParam.trim() : '';

      if (monthFromRoute) {
        if (routeMonthHandledRef.current === monthFromRoute) {
          return;
        }

        routeMonthHandledRef.current = monthFromRoute;
        setSelectedMonthKey(monthFromRoute);
        setSelectedWeekKey(undefined);
        setSelectedDayDate(null);
        loadRevenue(monthFromRoute);
        return;
      }

      routeMonthHandledRef.current = null;
      loadRevenue(selectedMonthKeyRef.current, selectedWeekKeyRef.current);
    }, [loadRevenue, monthParam]),
  );

  const monthlyChartPoints = useMemo(
    () =>
      [...(analytics?.months ?? [])]
        .filter((month) => month.revenue > 0)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .slice(-6)
        .map((month) => ({
          key: month.monthKey,
          label: month.label.replace(/^\d{4}년\s/, ''),
          value: month.revenue,
          subLabel: `${month.settlementCount}건`,
        })),
    [analytics?.months],
  );

  const settlementCountByDate = useMemo(() => {
    if (!analytics) {
      return {};
    }

    const counts: Record<string, number> = {};

    for (const item of analytics.recentSettlements) {
      counts[item.date] = (counts[item.date] ?? 0) + 1;
    }

    return counts;
  }, [analytics?.recentSettlements]);

  const visibleSettlements = useMemo(() => {
    if (!analytics) {
      return [];
    }

    if (selectedDayDate) {
      return analytics.recentSettlements.filter((item) => item.date === selectedDayDate);
    }

    if (selectedWeekKey && analytics.selectedWeek) {
      const weekDates = new Set(analytics.selectedWeek.days.map((day) => day.date));

      return analytics.recentSettlements.filter((item) => weekDates.has(item.date));
    }

    return analytics.recentSettlements;
  }, [analytics, selectedDayDate, selectedWeekKey]);

  const settlementSectionTitle = useMemo(() => {
    if (!analytics) {
      return '';
    }

    if (selectedDayDate) {
      const day = analytics.selectedWeek.days.find((cell) => cell.date === selectedDayDate);

      if (day) {
        return `${day.dateWithWeekdayLabel} 정산`;
      }
    }

    if (selectedWeekKey && analytics.selectedWeek.label) {
      return `${analytics.selectedWeek.label} 정산 상세`;
    }

    return `${analytics.selectedMonth.label} 정산 상세`;
  }, [analytics, selectedDayDate, selectedWeekKey]);

  const linkedMetrics = useMemo(() => {
    if (!analytics) {
      return null;
    }

    const selectedDay = selectedDayDate
      ? analytics.selectedWeek.days.find((day) => day.date === selectedDayDate)
      : null;

    if (selectedDay) {
      const pending = analytics.pendingPayoutByDate[selectedDay.date] ?? { amount: 0, count: 0 };
      const dayHeading = formatKoreanMonthDayWeekday(selectedDay.date);

      return {
        treatmentLabel: '시술',
        treatmentLabelSub: dayHeading || undefined,
        treatmentCount: analytics.treatmentCountByDate[selectedDay.date] ?? 0,
        pendingAmount: pending.amount,
        pendingCount: pending.count,
        periodLabel: '합계',
        periodLabelSub: dayHeading || undefined,
        periodTotal: selectedDay.totalAmount,
      };
    }

    return {
      treatmentLabel: '월 총 시술 건수',
      treatmentLabelSub: undefined,
      treatmentCount: analytics.selectedMonthTreatmentCount,
      pendingAmount: analytics.monthPendingPayoutAmount,
      pendingCount: analytics.monthPendingPayoutCount,
      periodLabel: '선택 주 합계',
      periodLabelSub: undefined,
      periodTotal: analytics.selectedWeek.weekTotal,
    };
  }, [analytics, selectedDayDate]);

  const hasAnyRevenue = Boolean(
    analytics &&
      (analytics.months.some((month) => month.revenue > 0) ||
        analytics.monthPendingPayoutCount > 0),
  );

  const handleSelectMonth = (monthKey: string) => {
    if (monthKey === selectedMonthKey) {
      return;
    }

    routeMonthHandledRef.current = monthKey;

    if (typeof monthParam === 'string' && monthParam.trim()) {
      router.setParams({ month: '' });
    }

    setSelectedMonthKey(monthKey);
    setSelectedWeekKey(undefined);
    setSelectedDayDate(null);
    loadRevenue(monthKey);
  };

  const handleSelectWeek = (weekKey: string) => {
    if (weekKey === selectedWeekKey) {
      setScopeTab('week');
      return;
    }

    setSelectedWeekKey(weekKey);
    setSelectedDayDate(null);
    setScopeTab('week');
    loadRevenue(selectedMonthKey, weekKey);
  };

  const handleSelectDay = (day: WeekdayRevenueCell) => {
    setSelectedDayDate(day.date);
    setScopeTab('day');
  };

  const handleSelectSettlementDay = (date: string) => {
    setSelectedDayDate(date);
    setScopeTab('day');
  };

  const handleSelectMonthFromChart = (monthKey: string) => {
    handleSelectMonth(monthKey);
    setScopeTab('month');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>매출 분석</Text>
        <Text style={styles.pageSubtitle}>
          월별 매출과 주간(월~일) 합계를 한 화면에서 확인하세요
        </Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !analytics ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage || '데이터를 불러올 수 없습니다.'}</Text>
          </View>
        ) : !hasAnyRevenue ? (
          <EmptyState
            icon="📊"
            subtitle="정산 완료되면 월별·주간 매출이 표시됩니다"
            title="매출 데이터가 없어요"
          />
        ) : (
          <>
            <RevenueScopeTabs onChange={setScopeTab} value={scopeTab} />

            {scopeTab === 'month' ? (
              <>
                <RevenueBarChart
                  barColor={PURPLE}
                  emptyMessage="월별 정산 매출이 없습니다"
                  onSelectPoint={handleSelectMonthFromChart}
                  points={monthlyChartPoints.map((point) => ({
                    ...point,
                    selected: point.key === analytics.selectedMonthKey,
                  }))}
                  title="월별 매출 (정산 완료)"
                />

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>월 선택</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.monthChipRow}>
                      {analytics.months.map((month) => {
                        const selected = month.monthKey === analytics.selectedMonthKey;

                        return (
                          <Pressable
                            key={month.monthKey}
                            onPress={() => {
                          handleSelectMonth(month.monthKey);
                          setScopeTab('month');
                        }}
                            style={({ pressed }) => [
                              styles.monthChip,
                              selected && styles.monthChipSelected,
                              pressed && styles.monthChipPressed,
                            ]}>
                            <Text style={[styles.monthChipText, selected && styles.monthChipTextSelected]}>
                              {month.label}
                            </Text>
                            <Text
                              style={[
                                styles.monthChipAmount,
                                selected && styles.monthChipAmountSelected,
                              ]}>
                              {month.revenue.toLocaleString('ko-KR')}원
                            </Text>
                            <Text
                              style={[
                                styles.monthChipMeta,
                                selected && styles.monthChipMetaSelected,
                              ]}>
                              {month.settlementCount}건
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.heroCard}>
                  <Text style={styles.heroLabel}>{analytics.selectedMonth.label} 매출</Text>
                  <View style={styles.heroValueRow}>
                    <Text style={styles.heroValue}>
                      {analytics.selectedMonth.revenue.toLocaleString('ko-KR')}
                    </Text>
                    <Text style={styles.heroValueUnit}>원</Text>
                  </View>
                  <Text style={styles.heroUnit}>정산 {analytics.selectedMonth.settlementCount}건</Text>
                </View>
              </>
            ) : null}

            {scopeTab === 'week' ? (
              <WeeklyRevenuePanel
                days={analytics.selectedWeek.days}
                onSelectDay={handleSelectDay}
                onSelectWeek={handleSelectWeek}
                selectedDate={selectedDayDate}
                selectedWeekKey={analytics.selectedWeekKey}
                weeks={analytics.weeklyWeeks}
              />
            ) : null}

            {scopeTab === 'day' && !selectedDayDate ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>주간 탭에서 요일 막대를 눌러 일별 상세를 확인하세요.</Text>
              </View>
            ) : null}

            {linkedMetrics ? (
              <RevenueMetricsChart
                data={linkedMetrics}
                title={
                  scopeTab === 'day' && selectedDayDate
                    ? analytics.selectedWeek.days.find((day) => day.date === selectedDayDate)
                        ?.dateWithWeekdayLabel ?? '일별 지표'
                    : scopeTab === 'week'
                      ? `${analytics.selectedWeek.label} 지표`
                      : `${analytics.selectedMonth.label} 지표`
                }
              />
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{settlementSectionTitle}</Text>

              {scopeTab !== 'month' && analytics.selectedWeek.days.length > 0 ? (
                <SettlementWeekDayTabs
                  days={analytics.selectedWeek.days}
                  onSelectDate={handleSelectSettlementDay}
                  selectedDate={selectedDayDate}
                  settlementCountByDate={settlementCountByDate}
                />
              ) : null}

              {visibleSettlements.length === 0 ? (
                <Text style={styles.emptyText}>
                  {selectedDayDate
                    ? '해당 날짜에 정산 완료 내역이 없습니다.'
                    : selectedWeekKey && analytics.selectedWeek.label
                      ? '해당 주 정산 완료 내역이 없습니다.'
                      : '해당 월 정산 완료 내역이 없습니다.'}
                </Text>
              ) : (
                visibleSettlements.map((item) => (
                  <View key={item.paymentId} style={styles.settlementRow}>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementDate}>{item.dateWithWeekdayLabel}</Text>
                      <Text style={styles.settlementCustomer}>{item.customerName}</Text>
                      <Text style={styles.settlementMeta}>{item.treatmentTitle}</Text>
                    </View>
                    <Text style={styles.settlementPrice}>{item.payout.toLocaleString('ko-KR')}원</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  content: { gap: 16, paddingHorizontal: 16 },
  pageTitle: { color: '#1A1A2E', fontSize: 24, fontWeight: '900' },
  pageSubtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: -8,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroLabel: { color: '#6B6B7B', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  heroValueRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  heroValue: { color: '#1A1A2E', fontSize: 40, fontWeight: '900' },
  heroValueUnit: { color: '#1A1A2E', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  heroUnit: { color: '#6B6B7B', fontSize: 14, fontWeight: '600', marginTop: 6 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  cardTitle: { color: '#1A1A2E', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  monthChipRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  monthChip: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  monthChipSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  monthChipPressed: { opacity: 0.9 },
  monthChipText: { color: '#1A1A2E', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  monthChipTextSelected: { color: PURPLE },
  monthChipAmount: { color: CORAL, fontSize: 16, fontWeight: '900' },
  monthChipAmountSelected: { color: CORAL },
  monthChipMeta: { color: '#6B6B7B', fontSize: 12, fontWeight: '600', marginTop: 2 },
  monthChipMetaSelected: { color: '#6B6B7B' },
  settlementRow: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settlementInfo: { flex: 1, gap: 2 },
  settlementDate: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  settlementCustomer: { color: '#1A1A2E', fontSize: 15, fontWeight: '800' },
  settlementMeta: { color: '#6B6B7B', fontSize: 13, fontWeight: '600' },
  settlementPrice: { color: CORAL, fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#6B6B7B', fontSize: 14, fontWeight: '600' },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  stateText: { color: '#6B6B7B', fontSize: 14, textAlign: 'center' },
});
