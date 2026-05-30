import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchDesignerRevenueAnalytics,
  type DesignerRevenueAnalytics,
  type WeekdayRevenueCell,
} from '../../lib/designer-revenue-analytics';
import { getErrorMessage } from '../../lib/errors';
import { mapRevenueSettlementsToGridItems } from '../../lib/designer-customer-grid';
import { RevenueBarChart } from '../../src/components/revenue-bar-chart';
import { CustomerGrid } from '../../src/components/customer-grid';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import {
  DesignerRevenueMetricGrid,
  type DesignerRevenueMetricItem,
} from '../../src/components/designer-revenue-metric-grid';
import {
  RevenueChartTabBar,
  type RevenueChartTabKey,
} from '../../src/components/revenue-chart-tab-bar';
import { WeeklyRevenuePanel } from '../../src/components/weekly-revenue-panel';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

type SettlementListMode = 'month' | 'pending';

export default function DesignerRevenueScreen() {
  const insets = useSafeAreaInsets();
  const { month: monthParam } = useLocalSearchParams<{ month?: string | string[] }>();
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>(undefined);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | undefined>(undefined);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [settlementListMode, setSettlementListMode] = useState<SettlementListMode>('month');
  const [chartTab, setChartTab] = useState<RevenueChartTabKey>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const monthSectionY = useRef(0);
  const weekSectionY = useRef(0);
  const settlementSectionY = useRef(0);

  const scrollToSection = useCallback((offsetY: number) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, offsetY - 12),
      animated: true,
    });
  }, []);

  const loadRevenue = useCallback((monthKey?: string, weekKey?: string) => {
    setIsLoading(true);

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
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매출 데이터를 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const monthFromRoute = Array.isArray(monthParam) ? monthParam[0] : monthParam;
      const monthToLoad =
        typeof monthFromRoute === 'string' && /^\d{4}-\d{2}$/.test(monthFromRoute)
          ? monthFromRoute
          : selectedMonthKey;

      loadRevenue(monthToLoad, selectedWeekKey);
    }, [loadRevenue, monthParam, selectedMonthKey, selectedWeekKey]),
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

  const visibleSettlements = useMemo(() => {
    if (!analytics) {
      return [];
    }

    if (settlementListMode === 'pending') {
      return analytics.pendingSettlements;
    }

    if (!selectedDayDate) {
      return analytics.recentSettlements;
    }

    return analytics.recentSettlements.filter((item) => item.date === selectedDayDate);
  }, [analytics, selectedDayDate, settlementListMode]);

  const settlementSectionTitle = useMemo(() => {
    if (!analytics) {
      return '';
    }

    if (settlementListMode === 'pending') {
      return '정산 대기';
    }

    if (selectedDayDate) {
      const day = analytics.selectedWeek.days.find((cell) => cell.date === selectedDayDate);

      if (day) {
        return `${day.dateWithWeekdayLabel} 정산`;
      }
    }

    return `${analytics.selectedMonth.label} 정산 상세`;
  }, [analytics, selectedDayDate, settlementListMode]);

  const hasAnyRevenue = Boolean(
    analytics &&
      (analytics.months.some((month) => month.revenue > 0) || analytics.pendingPayoutCount > 0),
  );

  const handleSelectMonth = (monthKey: string) => {
    if (monthKey === selectedMonthKey) {
      return;
    }

    setSettlementListMode('month');
    setSelectedMonthKey(monthKey);
    setSelectedWeekKey(undefined);
    setSelectedDayDate(null);
    loadRevenue(monthKey);
  };

  const handleSelectWeek = (weekKey: string) => {
    if (weekKey === selectedWeekKey) {
      return;
    }

    setSelectedWeekKey(weekKey);
    setSelectedDayDate(null);
    loadRevenue(selectedMonthKey, weekKey);
  };

  const handleSelectDay = (day: WeekdayRevenueCell) => {
    setSettlementListMode('month');
    setSelectedDayDate(day.date);
  };

  const showPendingSettlements = useCallback(() => {
    setSettlementListMode('pending');
    setSelectedDayDate(null);
    scrollToSection(settlementSectionY.current);
  }, [scrollToSection]);

  const revenueMetricItems = useMemo((): DesignerRevenueMetricItem[] => {
    if (!analytics) {
      return [];
    }

    return [
      {
        key: 'avg-price',
        label: '월 평균 시술가',
        value: `${analytics.averageTreatmentPrice.toLocaleString('ko-KR')}원`,
        onPress: () => {
          setSettlementListMode('month');
          scrollToSection(monthSectionY.current);
        },
      },
      {
        key: 'pending-amount',
        label: '정산 대기',
        tone: 'danger',
        value: `${analytics.pendingPayoutAmount.toLocaleString('ko-KR')}원`,
        onPress: showPendingSettlements,
      },
      {
        key: 'pending-count',
        label: '대기 건수',
        tone: 'danger',
        value: `${analytics.pendingPayoutCount}건`,
        onPress: showPendingSettlements,
      },
      {
        key: 'week-total',
        label: '선택 주 합계',
        tone: 'success',
        value: `${analytics.selectedWeek.weekTotal.toLocaleString('ko-KR')}원`,
        onPress: () => {
          setSettlementListMode('month');
          setSelectedDayDate(null);
          setChartTab('weekday');
          scrollToSection(weekSectionY.current);
        },
      },
    ];
  }, [analytics, scrollToSection, showPendingSettlements]);

  const handlePressMonthChart = (monthKey: string) => {
    handleSelectMonth(monthKey);
    scrollToSection(monthSectionY.current);
  };

  const settlementGridItems = useMemo(
    () => mapRevenueSettlementsToGridItems(visibleSettlements),
    [visibleSettlements],
  );

  const handleSettlementPress = useCallback(
    (paymentId: string) => {
      const item = visibleSettlements.find((row) => row.paymentId === paymentId);

      if (item?.treatmentId) {
        router.push(`/designer/treatment/${item.treatmentId}`);
      }
    },
    [visibleSettlements],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>매출</Text>
        <Text style={styles.pageSubtitle}>월별·주간 정산 매출을 확인하세요</Text>

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
            <View
              style={styles.chartCard}
              onLayout={(event) => {
                weekSectionY.current = event.nativeEvent.layout.y;
              }}>
              <RevenueChartTabBar activeTab={chartTab} onSelectTab={setChartTab} />
              {chartTab === 'monthly' ? (
                <RevenueBarChart
                  barColor={PURPLE}
                  embedded
                  emptyMessage="월별 정산 매출이 없습니다"
                  onPressPoint={handlePressMonthChart}
                  points={monthlyChartPoints}
                  selectedKey={analytics.selectedMonthKey}
                />
              ) : (
                <WeeklyRevenuePanel
                  days={analytics.selectedWeek.days}
                  embedded
                  onSelectDay={handleSelectDay}
                  onSelectWeek={handleSelectWeek}
                  selectedDate={selectedDayDate}
                  selectedWeekKey={analytics.selectedWeekKey}
                  weeklyWeeks={analytics.weeklyWeeks}
                />
              )}
            </View>

            <View
              style={styles.card}
              onLayout={(event) => {
                monthSectionY.current = event.nativeEvent.layout.y;
              }}>
              <Text style={styles.cardTitle}>월 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.monthChipRow}>
                  {analytics.months.map((month) => {
                    const selected = month.monthKey === analytics.selectedMonthKey;

                    return (
                      <Pressable
                        key={month.monthKey}
                        onPress={() => handleSelectMonth(month.monthKey)}
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
              <Text style={styles.heroValue}>
                {analytics.selectedMonth.revenue.toLocaleString('ko-KR')}
              </Text>
              <Text style={styles.heroUnit}>원 · 정산 {analytics.selectedMonth.settlementCount}건</Text>
            </View>

            <DesignerRevenueMetricGrid items={revenueMetricItems} />

            <View
              style={styles.card}
              onLayout={(event) => {
                settlementSectionY.current = event.nativeEvent.layout.y;
              }}>
              <Text style={styles.cardTitle}>{settlementSectionTitle}</Text>
              {visibleSettlements.length === 0 ? (
                <Text style={styles.emptyText}>
                  {settlementListMode === 'pending'
                    ? '정산 대기 중인 시술이 없습니다.'
                    : selectedDayDate
                      ? '해당 날짜에 정산 완료 내역이 없습니다.'
                      : '해당 월 정산 완료 내역이 없습니다.'}
                </Text>
              ) : (
                <CustomerGrid items={settlementGridItems} onPressItem={handleSettlementPress} />
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
  heroValue: { color: '#1A1A2E', fontSize: 40, fontWeight: '900' },
  heroUnit: { color: '#6B6B7B', fontSize: 14, fontWeight: '600', marginTop: 4 },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 14,
    padding: 16,
  },
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
  emptyText: { color: '#6B6B7B', fontSize: 14, fontWeight: '600' },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  stateText: { color: '#6B6B7B', fontSize: 14, textAlign: 'center' },
});
