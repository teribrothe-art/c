import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DailyRevenuePoint } from '../../lib/designer-revenue-analytics';
import {
  buildMonthCalendarGrid,
  CALENDAR_WEEKDAY_HEADERS,
  countTreatmentsInMonth,
} from '../../lib/designer-client-month-calendar';
import { formatDateWithWeekday } from '../../lib/designer-revenue-weekly';
import {
  getCalendarWeekdayHeaderColor,
  getTreatmentWeekdayColor,
} from '../../lib/designer-customer-grid';
import { formatAmount } from '../../lib/currency-input';
import { colors } from '../../lib/theme';
import { RevenuePeriodNavigator } from './revenue-period-navigator';

type DesignerRevenueMonthCalendarProps = {
  year: number;
  month: number;
  dailyTotals: DailyRevenuePoint[];
  selectedDate: string | null;
  showAllDates: boolean;
  canPrevious: boolean;
  canNext: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string | null) => void;
  onShowAllDates: () => void;
};

export function DesignerRevenueMonthCalendar({
  year,
  month,
  dailyTotals,
  selectedDate,
  showAllDates,
  canPrevious,
  canNext,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onShowAllDates,
}: DesignerRevenueMonthCalendarProps) {
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();

    for (const day of dailyTotals) {
      if (day.settlementCount > 0) {
        map.set(day.date, day.settlementCount);
      }
    }

    return map;
  }, [dailyTotals]);

  const cells = useMemo(
    () => buildMonthCalendarGrid(year, month, countByDate, selectedDate),
    [countByDate, month, selectedDate, year],
  );

  const monthTotal = countTreatmentsInMonth(countByDate, year, month);
  const selectedDay = selectedDate
    ? dailyTotals.find((day) => day.date === selectedDate) ?? null
    : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.hint}>달력에서 날짜를 선택하세요</Text>
        <View style={styles.captionRow}>
          <Text style={styles.caption}>
            {selectedDay
              ? `${formatDateWithWeekday(selectedDay.date)} · `
              : showAllDates
                ? `${year}년 ${month}월 전체 · `
                : `${year}년 ${month}월 · `}
          </Text>
          <Text style={styles.captionCount}>
            {(selectedDay ? selectedDay.settlementCount : monthTotal).toLocaleString('ko-KR')}건
          </Text>
          {selectedDay ? (
            <Text style={styles.captionAmount}> · {formatAmount(selectedDay.totalAmount)}</Text>
          ) : null}
        </View>
      </View>

      <RevenuePeriodNavigator
        canNext={canNext}
        canPrevious={canPrevious}
        label={`${year}년 ${month}월`}
        onNext={onNextMonth}
        onPrevious={onPreviousMonth}
      />

      <View style={styles.weekdayRow}>
        {CALENDAR_WEEKDAY_HEADERS.map((label, index) => (
          <Text
            key={label}
            style={[styles.weekday, { color: getCalendarWeekdayHeaderColor(index) }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell.inMonth || !cell.dateKey) {
            return <View key={`pad-${index}`} style={styles.dayCell} />;
          }

          const weekday = new Date(cell.dateKey + 'T00:00:00').getDay();

          return (
            <Pressable
              key={cell.dateKey}
              accessibilityLabel={`${cell.day}일 ${cell.count}건`}
              accessibilityState={{ selected: cell.isSelected, disabled: !cell.selectable }}
              disabled={!cell.selectable}
              onPress={() => {
                if (cell.isSelected) {
                  onSelectDate(null);
                  return;
                }

                onSelectDate(cell.dateKey);
              }}
              style={({ pressed }) => [
                styles.dayCell,
                cell.selectable && styles.dayCellActive,
                cell.isSelected && styles.dayCellSelected,
                cell.isToday && !cell.isSelected && styles.dayCellToday,
                !cell.selectable && styles.dayCellDisabled,
                pressed && cell.selectable && styles.dayCellPressed,
              ]}>
              <Text
                style={[
                  styles.dayNumber,
                  !cell.isSelected &&
                    cell.selectable && { color: getTreatmentWeekdayColor(weekday) },
                  cell.isSelected && styles.dayNumberSelected,
                  !cell.selectable && styles.dayNumberDisabled,
                ]}>
                {cell.day}
              </Text>
              {cell.count > 0 ? (
                <Text style={styles.dayCount}>{cell.count}</Text>
              ) : (
                <View style={styles.dayCountSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onShowAllDates}
        style={({ pressed }) => [
          styles.allButton,
          showAllDates && selectedDate === null && styles.allButtonSelected,
          pressed && styles.allButtonPressed,
        ]}>
        <Text
          style={[
            styles.allButtonText,
            showAllDates && selectedDate === null && styles.allButtonTextSelected,
          ]}>
          {showAllDates && selectedDate === null ? '전체 닫기' : '전체 날짜'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  header: {
    gap: 2,
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  captionRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  caption: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  captionCount: {
    color: colors.mint,
    fontSize: 15,
    fontWeight: '900',
  },
  captionAmount: {
    color: '#7B5EE6',
    fontSize: 14,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekday: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    paddingVertical: 2,
    width: `${100 / 7}%`,
  },
  dayCellActive: {
    backgroundColor: '#FAFAFC',
  },
  dayCellSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: '#7B5EE6',
    borderWidth: 1.5,
  },
  dayCellToday: {
    borderColor: '#00C2A8',
    borderWidth: 1,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCellPressed: {
    opacity: 0.88,
  },
  dayNumber: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  dayNumberSelected: {
    color: '#7B5EE6',
  },
  dayNumberDisabled: {
    color: '#9CA3AF',
  },
  dayCount: {
    color: colors.mint,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
    marginTop: 1,
  },
  dayCountSpacer: {
    height: 12,
  },
  allButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    paddingVertical: 10,
  },
  allButtonSelected: {
    backgroundColor: '#F0EBFF',
  },
  allButtonPressed: {
    opacity: 0.9,
  },
  allButtonText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  allButtonTextSelected: {
    color: '#7B5EE6',
  },
});
