import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell, WeeklyRevenueWeek } from '../../lib/designer-revenue-analytics';
import { RevenueBarChart } from './revenue-bar-chart';

const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

type WeeklyRevenuePanelProps = {
  weeklyWeeks: WeeklyRevenueWeek[];
  selectedWeekKey: string;
  onSelectWeek: (weekKey: string) => void;
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDay: (day: WeekdayRevenueCell) => void;
};

function formatWeekTabAmount(total: number) {
  if (total <= 0) {
    return '0원';
  }

  if (total >= 10000) {
    return `${Math.round(total / 10000).toLocaleString('ko-KR')}만`;
  }

  return `${total.toLocaleString('ko-KR')}원`;
}

export function WeeklyRevenuePanel({
  weeklyWeeks,
  selectedWeekKey,
  onSelectWeek,
  days,
  selectedDate,
  onSelectDay,
}: WeeklyRevenuePanelProps) {
  const chartPoints = days.map((day) => ({
    key: day.date,
    label: day.weekdayLabel,
    value: day.totalAmount,
    subLabel: day.settlementCount > 0 ? `${day.settlementCount}건` : undefined,
  }));

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  const handlePressChartDay = (dateKey: string) => {
    const day = days.find((item) => item.date === dateKey);

    if (day) {
      onSelectDay(day);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>요일별 합계</Text>

      {weeklyWeeks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabScroll}>
          <View style={styles.weekTabRow}>
            {weeklyWeeks.map((week) => {
              const selected = week.weekKey === selectedWeekKey;

              return (
                <Pressable
                  key={week.weekKey}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => onSelectWeek(week.weekKey)}
                  style={({ pressed }) => [
                    styles.weekTab,
                    selected && styles.weekTabSelected,
                    pressed && styles.weekTabPressed,
                  ]}>
                  <Text style={[styles.weekTabLabel, selected && styles.weekTabLabelSelected]}>
                    {week.label}
                  </Text>
                  <Text style={[styles.weekTabAmount, selected && styles.weekTabAmountSelected]}>
                    {formatWeekTabAmount(week.weekTotal)}
                  </Text>
                  <Text style={[styles.weekTabMeta, selected && styles.weekTabMetaSelected]}>
                    {week.settlementCount}건
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={100}
        onPressPoint={handlePressChartDay}
        points={chartPoints}
        selectedKey={selectedDate}
      />

      {selectedDay ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selectedDay.dateWithWeekdayLabel}</Text>
          <Text style={styles.detailAmount}>{selectedDay.totalAmount.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.detailMeta}>정산 {selectedDay.settlementCount}건</Text>
        </View>
      ) : (
        <Text style={styles.hint}>주간 탭·막대를 누르면 날짜별 정산 합계를 확인할 수 있어요</Text>
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
  weekTabScroll: {
    marginHorizontal: -4,
  },
  weekTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  weekTab: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekTabSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  weekTabPressed: {
    opacity: 0.92,
  },
  weekTabLabel: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  weekTabLabelSelected: {
    color: PURPLE,
  },
  weekTabAmount: {
    color: '#FF5A5F',
    fontSize: 15,
    fontWeight: '900',
  },
  weekTabAmountSelected: {
    color: '#FF5A5F',
  },
  weekTabMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  weekTabMetaSelected: {
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
