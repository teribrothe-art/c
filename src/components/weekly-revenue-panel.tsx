import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell } from '../../lib/designer-revenue-analytics';
import { RevenueBarChart, type RevenueBarChartPoint } from './revenue-bar-chart';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

function formatDayDateLabel(date: string) {
  const [, month, day] = date.split('-');

  return `${Number(month)}.${Number(day)}`;
}

function dayToChartPoint(day: WeekdayRevenueCell): RevenueBarChartPoint {
  return {
    key: day.date,
    label: day.weekdayLabel,
    value: day.totalAmount,
    subLabel:
      day.settlementCount > 0
        ? `${day.settlementCount}건\n${formatDayDateLabel(day.date)}`
        : formatDayDateLabel(day.date),
    muted: !day.inSelectedMonth,
    isToday: day.isToday,
  };
}

type WeeklyRevenuePanelProps = {
  weekLabel: string;
  weekTotal: number;
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
  weekTotal,
  days,
  selectedDate,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  canGoPrev = false,
  canGoNext = false,
}: WeeklyRevenuePanelProps) {
  const chartPoints = days.map(dayToChartPoint);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  const handleSelectPoint = (point: RevenueBarChartPoint) => {
    const day = days.find((cell) => cell.date === point.key);

    if (day) {
      onSelectDay(day);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>요일별 합계</Text>
          <Text style={styles.subtitle}>주간(월~일) · 막대를 눌러 날짜를 선택하세요</Text>
        </View>
        <View style={styles.weekNav}>
          <Pressable
            disabled={!canGoPrev}
            onPress={onPrevWeek}
            style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <View style={styles.weekLabelBlock}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <Text style={styles.weekTotal}>{weekTotal.toLocaleString('ko-KR')}원</Text>
          </View>
          <Pressable
            disabled={!canGoNext}
            onPress={onNextWeek}
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>
      </View>

      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={112}
        onSelectPoint={handleSelectPoint}
        points={chartPoints}
        selectedKey={selectedDate}
        showTitle={false}
        title="요일별 합계"
        unitHint="일별 정산 합계 (원)"
      />

      {selectedDay ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selectedDay.dateWithWeekdayLabel}</Text>
          <Text style={styles.detailAmount}>{selectedDay.totalAmount.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.detailMeta}>정산 {selectedDay.settlementCount}건</Text>
        </View>
      ) : (
        <Text style={styles.hint}>요일 막대를 누르면 해당 날짜 정산 합계를 확인할 수 있어요</Text>
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
    gap: 12,
  },
  headerText: {
    gap: 4,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
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
  weekLabelBlock: {
    alignItems: 'center',
    gap: 2,
    minWidth: 148,
  },
  weekLabel: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  weekTotal: {
    color: CORAL,
    fontSize: 13,
    fontWeight: '800',
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
