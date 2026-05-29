import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell } from '../../lib/designer-revenue-analytics';
import { colors } from '../../lib/theme';

type SettlementWeekDayTabsProps = {
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  settlementCountByDate?: Record<string, number>;
};

export function resolveDefaultSettlementDay(
  days: WeekdayRevenueCell[],
  settlementCountByDate: Record<string, number> = {},
) {
  const today = days.find((day) => day.isToday);

  if (today) {
    return today.date;
  }

  const withSettlements = days.find((day) => (settlementCountByDate[day.date] ?? 0) > 0);

  if (withSettlements) {
    return withSettlements.date;
  }

  const withRevenue = days.find((day) => day.totalAmount > 0);

  return withRevenue?.date ?? days[0]?.date ?? null;
}

export function SettlementWeekDayTabs({
  days,
  selectedDate,
  onSelectDate,
  settlementCountByDate = {},
}: SettlementWeekDayTabsProps) {
  if (days.length === 0) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {days.map((day) => {
          const selected = day.date === selectedDate;
          const count = settlementCountByDate[day.date] ?? 0;

          return (
            <Pressable
              key={day.date}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectDate(day.date)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                day.isToday && !selected && styles.tabToday,
                pressed && styles.tabPressed,
              ]}>
              <Text style={[styles.dateLabel, selected && styles.dateLabelSelected]}>
                {day.weekdayDateLabel}
              </Text>
              <Text style={[styles.countLabel, selected && styles.countLabelSelected]}>
                {count > 0 ? `${count}건` : '0건'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabSelected: {
    backgroundColor: '#E6FFFA',
    borderColor: colors.mint,
  },
  tabToday: {
    borderColor: '#99F6E4',
  },
  tabPressed: {
    opacity: 0.9,
  },
  dateLabel: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  dateLabelSelected: {
    color: '#0F766E',
  },
  countLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  countLabelSelected: {
    color: '#0F766E',
  },
});
