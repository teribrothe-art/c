import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WeekdayRevenueCell } from '../../lib/designer-revenue-analytics';
import { colors } from '../../lib/theme';

type WeekDayTabsProps = {
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  /** 탭 아래 보조 라벨 (예: 매출 금액, 정산 건수) */
  getSubLabel: (day: WeekdayRevenueCell) => string;
  accent?: 'mint' | 'purple';
};

export function resolveDefaultWeekDay(
  days: WeekdayRevenueCell[],
  options?: {
    settlementCountByDate?: Record<string, number>;
    preferRevenue?: boolean;
  },
) {
  const today = days.find((day) => day.isToday);

  if (today) {
    return today.date;
  }

  const counts = options?.settlementCountByDate ?? {};

  if (!options?.preferRevenue) {
    const withSettlements = days.find((day) => (counts[day.date] ?? 0) > 0);

    if (withSettlements) {
      return withSettlements.date;
    }
  }

  const withRevenue = days.find((day) => day.totalAmount > 0);

  return withRevenue?.date ?? days[0]?.date ?? null;
}

/** @deprecated resolveDefaultWeekDay 사용 */
export const resolveDefaultSettlementDay = resolveDefaultWeekDay;

function formatRevenueTabAmount(amount: number) {
  if (amount <= 0) {
    return '0원';
  }

  if (amount >= 10000) {
    const man = amount / 10000;

    return Number.isInteger(man) ? `${man}만` : `${man.toFixed(1)}만`;
  }

  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatWeekDayRevenueSubLabel(day: WeekdayRevenueCell) {
  return formatRevenueTabAmount(day.totalAmount);
}

export function WeekDayTabs({
  days,
  selectedDate,
  onSelectDate,
  getSubLabel,
  accent = 'mint',
}: WeekDayTabsProps) {
  if (days.length === 0) {
    return null;
  }

  const selectedStyles = accent === 'purple' ? purpleSelectedStyles : mintSelectedStyles;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {days.map((day) => {
          const selected = day.date === selectedDate;

          return (
            <Pressable
              key={day.date}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectDate(day.date)}
              style={({ pressed }) => [
                styles.tab,
                selected && selectedStyles.tabSelected,
                day.isToday && !selected && styles.tabToday,
                pressed && styles.tabPressed,
              ]}>
              <Text style={[styles.dateLabel, selected && selectedStyles.dateLabelSelected]}>
                {day.weekdayDateLabel}
              </Text>
              <Text style={[styles.subLabel, selected && selectedStyles.subLabelSelected]}>
                {getSubLabel(day)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

type SettlementWeekDayTabsProps = {
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  settlementCountByDate?: Record<string, number>;
};

export function SettlementWeekDayTabs({
  days,
  selectedDate,
  onSelectDate,
  settlementCountByDate = {},
}: SettlementWeekDayTabsProps) {
  return (
    <WeekDayTabs
      days={days}
      getSubLabel={(day) => {
        const count = settlementCountByDate[day.date] ?? 0;

        return count > 0 ? `${count}건` : '0건';
      }}
      onSelectDate={onSelectDate}
      selectedDate={selectedDate}
    />
  );
}

type WeekdayRevenueTabsProps = {
  days: WeekdayRevenueCell[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

export function WeekdayRevenueTabs({ days, selectedDate, onSelectDate }: WeekdayRevenueTabsProps) {
  return (
    <WeekDayTabs
      accent="purple"
      days={days}
      getSubLabel={formatWeekDayRevenueSubLabel}
      onSelectDate={onSelectDate}
      selectedDate={selectedDate}
    />
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
  subLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});

const mintSelectedStyles = StyleSheet.create({
  tabSelected: {
    backgroundColor: '#E6FFFA',
    borderColor: colors.mint,
  },
  dateLabelSelected: {
    color: '#0F766E',
  },
  subLabelSelected: {
    color: '#0F766E',
  },
});

const purpleSelectedStyles = StyleSheet.create({
  tabSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: colors.purple,
  },
  dateLabelSelected: {
    color: colors.purple,
  },
  subLabelSelected: {
    color: '#6B21A8',
  },
});
