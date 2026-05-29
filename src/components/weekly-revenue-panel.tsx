import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell, WeeklyRevenueWeek } from '../../lib/designer-revenue-analytics';
import { RevenueBarChart } from './revenue-bar-chart';
import { WeekdayRevenueTabs } from './week-day-tabs';

const PURPLE = '#7B5EE6';
const MINT = '#00C2A8';

type WeeklyRevenuePanelProps = {
  weeks: WeeklyRevenueWeek[];
  selectedWeekKey: string;
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectWeek: (weekKey: string) => void;
  onSelectDay: (day: WeekdayRevenueCell) => void;
};

export function WeeklyRevenuePanel({
  weeks,
  selectedWeekKey,
  days,
  selectedDate,
  onSelectWeek,
  onSelectDay,
}: WeeklyRevenuePanelProps) {
  const selectedWeek = weeks.find((week) => week.weekKey === selectedWeekKey) ?? weeks[0];

  const chartPoints = days.map((day) => ({
    key: day.date,
    label: day.weekdayDateLabel,
    value: day.totalAmount,
    subLabel: `${day.settlementCount}건`,
    selected: day.date === selectedDate,
    dimmed: !day.inSelectedMonth,
    isToday: day.isToday,
  }));

  const handleSelectPoint = (date: string) => {
    const day = days.find((item) => item.date === date);

    if (day) {
      onSelectDay(day);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>주간 매출 (월~일)</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekTabRow}>
          {weeks.map((week) => {
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
                  {week.weekTotal.toLocaleString('ko-KR')}원
                </Text>
                <Text style={[styles.weekTabMeta, selected && styles.weekTabMetaSelected]}>
                  {week.settlementCount}건
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selectedWeek ? (
        <Text style={styles.weekSummary}>
          선택 주 합계 {selectedWeek.weekTotal.toLocaleString('ko-KR')}원 · 정산{' '}
          {selectedWeek.settlementCount}건
        </Text>
      ) : null}

      <WeekdayRevenueTabs
        days={days}
        onSelectDate={(date) => {
          const day = days.find((item) => item.date === date);

          if (day) {
            onSelectDay(day);
          }
        }}
        selectedDate={selectedDate}
      />

      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={112}
        onSelectPoint={handleSelectPoint}
        points={chartPoints}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 12,
    padding: 16,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  weekTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  weekTab: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 128,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekTabSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  weekTabPressed: {
    opacity: 0.9,
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
  weekSummary: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
