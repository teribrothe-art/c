import { StyleSheet, Text, View } from 'react-native';

import type { DailyRevenuePoint } from '../../lib/designer-revenue-analytics';
import { formatDateWithWeekday } from '../../lib/designer-revenue-weekly';
import { formatAmount } from '../../lib/currency-input';
import { RevenueBarChart } from './revenue-bar-chart';

const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

type WeeklyRevenuePanelProps = {
  monthLabel: string;
  dailyTotals: DailyRevenuePoint[];
  selectedDate: string | null;
  onSelectDay: (day: DailyRevenuePoint) => void;
};

export function WeeklyRevenuePanel({
  monthLabel,
  dailyTotals,
  selectedDate,
  onSelectDay,
}: WeeklyRevenuePanelProps) {
  const chartPoints = dailyTotals
    .filter((day) => day.totalAmount > 0)
    .map((day) => ({
      key: day.date,
      label: day.label,
      value: day.totalAmount,
      subLabel: day.settlementCount > 0 ? `${day.settlementCount}건` : undefined,
    }));

  const selectedDay = dailyTotals.find((day) => day.date === selectedDate) ?? null;

  const handlePressChartDay = (dateKey: string) => {
    const day = dailyTotals.find((item) => item.date === dateKey);

    if (day) {
      onSelectDay(day);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>일별 합계</Text>
      <Text style={styles.monthCaption}>{monthLabel} 기준</Text>

      <RevenueBarChart
        barColor={MINT}
        embedded
        labelPosition="insideBar"
        maxBarHeight={100}
        onPressPoint={handlePressChartDay}
        points={chartPoints}
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
