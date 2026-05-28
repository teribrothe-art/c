import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell } from '../../lib/designer-revenue-analytics';
import { RevenueBarChart } from './revenue-bar-chart';

const PURPLE = '#7B5EE6';

function formatDayDateLabel(date: string) {
  const [, month, day] = date.split('-');

  return `${Number(month)}.${Number(day)}`;
}

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
    subLabel: `${day.settlementCount}건`,
    dateLabel: formatDayDateLabel(day.date),
    selected: day.date === selectedDate,
    dimmed: !day.inSelectedMonth,
    isToday: day.isToday,
  }));

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  const handleSelectPoint = (date: string) => {
    const day = days.find((item) => item.date === date);

    if (day) {
      onSelectDay(day);
    }
  };

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

      <RevenueBarChart
        barColor="#00C2A8"
        embedded
        maxBarHeight={112}
        onSelectPoint={handleSelectPoint}
        points={chartPoints}
      />

      {selectedDay ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selectedDay.dateWithWeekdayLabel}</Text>
          <Text style={styles.detailAmount}>{selectedDay.totalAmount.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.detailMeta}>정산 {selectedDay.settlementCount}건</Text>
        </View>
      ) : null}
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
    color: '#00C2A8',
    fontSize: 24,
    fontWeight: '900',
  },
  detailMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
});
