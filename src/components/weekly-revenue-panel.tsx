import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DailyRevenuePoint } from '../../lib/designer-revenue-analytics';
import { formatDateWithWeekday } from '../../lib/designer-revenue-weekly';
import { formatAmount } from '../../lib/currency-input';
import { RevenueBarChart } from './revenue-bar-chart';

const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';
const PAGE_SIZE = 6;

type WeeklyRevenuePanelProps = {
  monthLabel: string;
  monthKey: string;
  dailyTotals: DailyRevenuePoint[];
  selectedDate: string | null;
  onSelectDay: (day: DailyRevenuePoint) => void;
};

export function WeeklyRevenuePanel({
  monthLabel,
  monthKey,
  dailyTotals,
  selectedDate,
  onSelectDay,
}: WeeklyRevenuePanelProps) {
  const [page, setPage] = useState(0);

  const chartPoints = useMemo(
    () =>
      dailyTotals
        .filter((day) => day.totalAmount > 0)
        .map((day) => ({
          key: day.date,
          label: day.label,
          value: day.totalAmount,
          subLabel: day.settlementCount > 0 ? `${day.settlementCount}건` : undefined,
        })),
    [dailyTotals],
  );

  useEffect(() => {
    setPage(0);
  }, [monthKey]);

  const pageCount = Math.max(1, Math.ceil(chartPoints.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visiblePoints = useMemo(
    () => chartPoints.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [chartPoints, safePage],
  );

  const canGoPrev = safePage > 0;
  const canGoNext = safePage < pageCount - 1;

  const selectedDay = dailyTotals.find((day) => day.date === selectedDate) ?? null;

  const handlePressChartDay = (dateKey: string) => {
    const day = dailyTotals.find((item) => item.date === dateKey);

    if (day) {
      onSelectDay(day);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>일별 합계</Text>

        {pageCount > 1 ? (
          <View style={styles.pager}>
            <Pressable
              accessibilityLabel={`이전 ${PAGE_SIZE}일`}
              disabled={!canGoPrev}
              onPress={() => setPage((current) => Math.max(0, current - 1))}
              style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.pageLabel}>
              {safePage + 1} / {pageCount}
            </Text>
            <Pressable
              accessibilityLabel={`다음 ${PAGE_SIZE}일`}
              disabled={!canGoNext}
              onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Text style={styles.monthCaption}>{monthLabel} 기준</Text>

      <RevenueBarChart
        barColor={MINT}
        embedded
        labelPosition="insideBar"
        maxBarHeight={100}
        onPressPoint={handlePressChartDay}
        points={visiblePoints}
        selectedKey={selectedDate}
        title=""
        emptyMessage="이번 달 정산 일별 데이터가 없어요"
      />

      {selectedDay ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{formatDateWithWeekday(selectedDay.date)}</Text>
          <Text style={styles.detailAmount}>{formatAmount(selectedDay.totalAmount)}</Text>
          <Text style={styles.detailMeta}>정산 {selectedDay.settlementCount}건</Text>
        </View>
      ) : (
        <Text style={styles.hint}>막대를 누르면 해당 날짜 정산 합계를 확인할 수 있어요</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 14,
    padding: 16,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  pager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '700',
  },
  pageLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  monthCaption: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '700',
    marginTop: -8,
  },
  detailBox: {
    backgroundColor: '#F0FBF9',
    borderRadius: 12,
    gap: 4,
    padding: 14,
  },
  detailTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
  },
  detailAmount: {
    color: MINT,
    fontSize: 24,
    fontWeight: '900',
  },
  detailMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
