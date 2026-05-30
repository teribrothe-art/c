import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { WeekdayRevenueCell } from '../../lib/designer-revenue-analytics';
import { RevenueBarChart } from './revenue-bar-chart';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

type WeeklyRevenuePanelProps = {
  weekLabel: string;
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDay: (day: WeekdayRevenueCell) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
};

export function WeeklyRevenuePanel({
  weekLabel,
  days,
  selectedDate,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  canGoPrev = false,
  canGoNext = false,
}: WeeklyRevenuePanelProps) {
  const chartPoints = days.map((day) => ({
    key: day.date,
    label: day.weekdayLabel,
    value: day.totalAmount,
    subLabel: day.settlementCount > 0 ? `${day.settlementCount}건` : undefined,
  }));

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>주간 매출 (월~일)</Text>
        <View style={styles.weekNav}>
          <Pressable
            disabled={!canGoPrev}
            onPress={onPrevWeek}
            style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable
            disabled={!canGoNext}
            onPress={onNextWeek}
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekGrid}>
        {days.map((day) => {
          const selected = day.date === selectedDate;

          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.dayCell,
                !day.inSelectedMonth && styles.dayCellOutsideMonth,
                day.isToday && styles.dayCellToday,
                selected && styles.dayCellSelected,
                pressed && styles.dayCellPressed,
              ]}>
              <Text style={[styles.weekday, selected && styles.weekdaySelected]}>{day.weekdayLabel}</Text>
              <Text style={[styles.dayAmount, selected && styles.dayAmountSelected]}>
                {day.totalAmount > 0 ? `${(day.totalAmount / 10000).toFixed(0)}만` : '-'}
              </Text>
              <Text style={[styles.dayCount, selected && styles.dayCountSelected]}>
                {day.settlementCount}건
              </Text>
            </Pressable>
          );
        })}
      </View>

      <RevenueBarChart
        barColor={MINT}
        maxBarHeight={100}
        points={chartPoints}
        title="요일별 합계"
      />

      {selectedDay ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selectedDay.dateWithWeekdayLabel}</Text>
          <Text style={styles.detailAmount}>{formatAmount(selectedDay.totalAmount)}</Text>
          <Text style={styles.detailMeta}>정산 {selectedDay.settlementCount}건</Text>
        </View>
      ) : (
        <Text style={styles.hint}>요일을 누르면 날짜·요일과 합계 금액을 확인할 수 있어요</Text>
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
  headerRow: {
    gap: 10,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  weekNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '700',
  },
  weekLabel: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 140,
    textAlign: 'center',
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 88,
    paddingVertical: 10,
  },
  dayCellOutsideMonth: {
    opacity: 0.55,
  },
  dayCellToday: {
    borderColor: '#FFD4D5',
  },
  dayCellSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
    borderWidth: 2,
  },
  dayCellPressed: {
    opacity: 0.9,
  },
  weekday: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  weekdaySelected: {
    color: PURPLE,
  },
  dayAmount: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
  },
  dayAmountSelected: {
    color: CORAL,
  },
  dayCount: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  dayCountSelected: {
    color: '#6B6B7B',
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
