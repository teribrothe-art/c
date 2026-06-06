import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buildMonthCalendarGrid,
  CALENDAR_WEEKDAY_HEADERS,
  canGoToNextCalendarMonth,
  canGoToPreviousCalendarMonth,
  countTreatmentsInMonth,
  shiftCalendarMonth,
} from '../../lib/designer-client-month-calendar';
import type { DesignerClientDateGroup } from '../../lib/designer-customer-grid';
import { colors } from '../../lib/theme';
import { RevenuePeriodNavigator } from './revenue-period-navigator';

type DesignerClientMonthCalendarProps = {
  year: number;
  month: number;
  groups: DesignerClientDateGroup[];
  selectedDate: string | null;
  earliestDateKey?: string | null;
  onChangeMonth: (year: number, month: number) => void;
  onSelectDate: (date: string | null) => void;
};

export function DesignerClientMonthCalendar({
  year,
  month,
  groups,
  selectedDate,
  earliestDateKey = null,
  onChangeMonth,
  onSelectDate,
}: DesignerClientMonthCalendarProps) {
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();

    for (const group of groups) {
      map.set(group.date, group.count);
    }

    return map;
  }, [groups]);

  const cells = useMemo(
    () => buildMonthCalendarGrid(year, month, countByDate, selectedDate),
    [countByDate, month, selectedDate, year],
  );

  const monthTotal = countTreatmentsInMonth(countByDate, year, month);
  const canPrevious = canGoToPreviousCalendarMonth(year, month, earliestDateKey);
  const canNext = canGoToNextCalendarMonth(year, month);

  const selectedGroup = selectedDate
    ? groups.find((group) => group.date === selectedDate) ?? null
    : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.hint}>달력에서 날짜를 선택하세요</Text>
        <View style={styles.captionRow}>
          <Text style={styles.caption}>
            {selectedGroup
              ? `${selectedGroup.label.split(' · ')[0]} · `
              : `${year}년 ${month}월 · `}
          </Text>
          <Text style={styles.captionCount}>
            {(selectedGroup ? selectedGroup.count : monthTotal).toLocaleString('ko-KR')}건
          </Text>
        </View>
      </View>

      <RevenuePeriodNavigator
        canNext={canNext}
        canPrevious={canPrevious}
        label={`${year}년 ${month}월`}
        onNext={() => {
          const next = shiftCalendarMonth(year, month, 1);
          onChangeMonth(next.year, next.month);
        }}
        onPrevious={() => {
          const prev = shiftCalendarMonth(year, month, -1);
          onChangeMonth(prev.year, prev.month);
        }}
      />

      <View style={styles.weekdayRow}>
        {CALENDAR_WEEKDAY_HEADERS.map((label, index) => (
          <Text
            key={label}
            style={[styles.weekday, (index === 0 || index === 6) && styles.weekdayWeekend]}>
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
          const isWeekend = weekday === 0 || weekday === 6;

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
                  isWeekend && styles.dayNumberWeekend,
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
        onPress={() => onSelectDate(null)}
        style={({ pressed }) => [
          styles.allButton,
          selectedDate === null && styles.allButtonSelected,
          pressed && styles.allButtonPressed,
        ]}>
        <Text style={[styles.allButtonText, selectedDate === null && styles.allButtonTextSelected]}>
          전체 날짜
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
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
  weekdayWeekend: {
    color: '#FF5A5F',
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
    backgroundColor: '#FFF0F0',
    borderColor: '#FF5A5F',
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
  dayNumberWeekend: {
    color: '#FF5A5F',
  },
  dayNumberSelected: {
    color: '#FF5A5F',
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
    backgroundColor: '#E8FAF7',
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
    color: '#00A88E',
  },
});
