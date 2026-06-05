import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import { getErrorMessage } from '../../lib/errors';
import type { OrgScope } from '../../lib/org-access';
import { fetchOrgWeeklyGrossSales, type OrgWeeklyGrossSalesSnapshot } from '../../lib/org-weekly-gross-sales';
import type { WeekdayRevenueCell } from '../../lib/designer-revenue-weekly';
import { sumWeekdayRevenueInMonth } from '../../lib/designer-revenue-weekly';
import { RevenuePeriodNavigator } from './revenue-period-navigator';

type SalesTab = 'weekday' | 'weekend';

const WEEKDAY_LABELS = new Set(['월', '화', '수', '목', '금']);
const WEEKEND_LABELS = new Set(['토', '일']);

type OrgWeeklySalesPanelProps = {
  scope: OrgScope;
  monthKey: string;
};

function filterDaysForTab(days: WeekdayRevenueCell[], tab: SalesTab) {
  const allowed = tab === 'weekday' ? WEEKDAY_LABELS : WEEKEND_LABELS;

  return days.filter((day) => allowed.has(day.weekdayLabel));
}

function sumDayAmounts(days: WeekdayRevenueCell[]) {
  return sumWeekdayRevenueInMonth(days);
}

export function OrgWeeklySalesPanel({ scope, monthKey }: OrgWeeklySalesPanelProps) {
  const [tab, setTab] = useState<SalesTab>('weekday');
  const [snapshot, setSnapshot] = useState<OrgWeeklyGrossSalesSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    (weekKey?: string) => {
      setIsLoading(true);

      fetchOrgWeeklyGrossSales(scope, monthKey, { weekKey })
        .then((data) => {
          setSnapshot(data);
          setErrorMessage('');
        })
        .catch((error) => {
          setSnapshot(null);
          setErrorMessage(getErrorMessage(error, '주간 매출을 불러오지 못했습니다.'));
        })
        .finally(() => setIsLoading(false));
    },
    [monthKey, scope],
  );

  useEffect(() => {
    load();
  }, [load]);

  const weekIndex = useMemo(() => {
    if (!snapshot) {
      return -1;
    }

    return snapshot.weeks.findIndex((week) => week.weekKey === snapshot.selectedWeekKey);
  }, [snapshot]);

  const visibleDays = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return filterDaysForTab(snapshot.selectedWeek.days, tab);
  }, [snapshot, tab]);

  const tabTotal = useMemo(() => sumDayAmounts(visibleDays), [visibleDays]);

  const weekdayTotal = useMemo(() => {
    if (!snapshot) {
      return 0;
    }

    return sumDayAmounts(filterDaysForTab(snapshot.selectedWeek.days, 'weekday'));
  }, [snapshot]);

  const weekendTotal = useMemo(() => {
    if (!snapshot) {
      return 0;
    }

    return sumDayAmounts(filterDaysForTab(snapshot.selectedWeek.days, 'weekend'));
  }, [snapshot]);

  const weekTotal = snapshot?.selectedWeek.weekTotal ?? 0;

  const handlePreviousWeek = () => {
    if (!snapshot || weekIndex <= 0) {
      return;
    }

    load(snapshot.weeks[weekIndex - 1].weekKey);
  };

  const handleNextWeek = () => {
    if (!snapshot || weekIndex < 0 || weekIndex >= snapshot.weeks.length - 1) {
      return;
    }

    load(snapshot.weeks[weekIndex + 1].weekKey);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>주간 매출</Text>

      <View style={styles.tabRow}>
        {(
          [
            { key: 'weekday' as const, label: '평일 매출' },
            { key: 'weekend' as const, label: '주말 매출' },
          ] as const
        ).map((item) => {
          const active = tab === item.key;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => [
                styles.tabCellWrap,
                pressed && styles.tabCellPressed,
              ]}>
              <View style={[styles.tabCell, active ? styles.tabCellActive : styles.tabCellIdle]}>
                <Text style={[styles.tabTitle, active && styles.tabTitleActive]}>{item.label}</Text>
                <Text style={[styles.tabSubtitle, active && styles.tabSubtitleActive]}>
                  {item.key === 'weekday' ? '월~금' : '토~일'}
                </Text>
                {!isLoading && snapshot ? (
                  <Text style={[styles.tabAmount, active && styles.tabAmountActive]}>
                    {formatAmount(item.key === 'weekday' ? weekdayTotal : weekendTotal)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>주간 매출 불러오는 중…</Text>
      ) : errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : snapshot ? (
        <View style={styles.weekCard}>
          <RevenuePeriodNavigator
            canNext={weekIndex >= 0 && weekIndex < snapshot.weeks.length - 1}
            canPrevious={weekIndex > 0}
            label={snapshot.selectedWeek.label || '선택 주'}
            onNext={handleNextWeek}
            onPrevious={handlePreviousWeek}
          />

          <View style={styles.weekTotalHero}>
            <Text style={styles.weekTotalLabel}>해당 주 총매출</Text>
            <Text style={styles.weekTotalValue}>{formatAmount(weekTotal)}</Text>
            <Text style={styles.weekTotalMeta}>
              평일 {formatAmount(weekdayTotal)} · 주말 {formatAmount(weekendTotal)}
            </Text>
          </View>

          <Text style={styles.weekSegmentTotal}>
            {tab === 'weekday' ? '평일' : '주말'} 상세 · {formatAmount(tabTotal)}
          </Text>

          {visibleDays.map((day) => {
            const outOfMonth = !day.inSelectedMonth;

            return (
              <View
                key={day.date}
                style={[styles.dayRow, outOfMonth && styles.dayRowOutOfMonth]}>
                <Text style={[styles.dayLabel, outOfMonth && styles.dayTextOutOfMonth]}>
                  {day.dateWithWeekdayLabel}
                  {outOfMonth ? ' · 타월' : ''}
                </Text>
                <Text style={[styles.dayValue, outOfMonth && styles.dayTextOutOfMonth]}>
                  {formatAmount(day.totalAmount)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabCellWrap: {
    flex: 1,
  },
  tabCell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tabCellIdle: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
  },
  tabCellActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  tabCellPressed: {
    opacity: 0.92,
  },
  tabTitle: {
    color: '#5EEAD4',
    fontSize: 14,
    fontWeight: '900',
  },
  tabTitleActive: {
    color: '#134E4A',
  },
  tabSubtitle: {
    color: '#99F6E4',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  tabSubtitleActive: {
    color: '#0F766E',
  },
  tabAmount: {
    color: '#99F6E4',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  tabAmountActive: {
    color: '#134E4A',
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B2F5EA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  weekTotalHero: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  weekTotalLabel: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
  },
  weekTotalValue: {
    color: '#134E4A',
    fontSize: 24,
    fontWeight: '900',
  },
  weekTotalMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  weekSegmentTotal: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
  },
  dayRow: {
    alignItems: 'center',
    borderTopColor: '#E8E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  dayRowOutOfMonth: {
    opacity: 0.42,
  },
  dayLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextOutOfMonth: {
    color: '#B8B8C8',
  },
  dayValue: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  loadingText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
