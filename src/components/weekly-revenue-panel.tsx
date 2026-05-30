import { StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { MonthWeekdayTotal } from '../../lib/designer-revenue-weekly';
import { RevenueBarChart } from './revenue-bar-chart';

const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

type WeeklyRevenuePanelProps = {
  monthLabel: string;
  weekdayTotals: MonthWeekdayTotal[];
  selectedWeekdayLabel: string | null;
  onSelectWeekday: (weekday: MonthWeekdayTotal) => void;
};

export function WeeklyRevenuePanel({
  monthLabel,
  weekdayTotals,
  selectedWeekdayLabel,
  onSelectWeekday,
}: WeeklyRevenuePanelProps) {
  const chartPoints = weekdayTotals.map((weekday) => ({
    key: weekday.weekdayLabel,
    label: weekday.weekdayLabel,
    value: weekday.totalAmount,
    subLabel: weekday.settlementCount > 0 ? `${weekday.settlementCount}건` : undefined,
  }));

  const selectedWeekday =
    weekdayTotals.find((weekday) => weekday.weekdayLabel === selectedWeekdayLabel) ?? null;

  const handlePressChartDay = (weekdayKey: string) => {
    const weekday = weekdayTotals.find((item) => item.weekdayLabel === weekdayKey);

    if (weekday) {
      onSelectWeekday(weekday);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>요일별 합계</Text>
      <Text style={styles.monthCaption}>{monthLabel} 기준</Text>

      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={100}
        onPressPoint={handlePressChartDay}
        points={chartPoints}
        selectedKey={selectedWeekdayLabel}
        title=""
      />

      {selectedWeekday ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{monthLabel} · {selectedWeekday.weekdayLabel}요일</Text>
          <Text style={styles.detailAmount}>{formatAmount(selectedWeekday.totalAmount)}</Text>
          <Text style={styles.detailMeta}>정산 {selectedWeekday.settlementCount}건</Text>
        </View>
      ) : (
        <Text style={styles.hint}>요일 막대를 누르면 해당 요일 정산 합계를 확인할 수 있어요</Text>
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
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
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
