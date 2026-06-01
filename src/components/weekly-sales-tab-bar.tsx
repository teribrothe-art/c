import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { OrgMonthlySalesCatalogItem, OrgMonthlySalesSummary } from '../../lib/org-monthly-sales';
import type { OrgWeeklySalesSummary, WeeklySalesSegment } from '../../lib/org-weekly-sales';

export type SalesPeriodMode = 'weekly' | 'monthly';

type WeeklySalesTabBarProps = {
  weeklySummary: OrgWeeklySalesSummary;
  weeklySegment: WeeklySalesSegment;
  onWeeklySegmentChange: (segment: WeeklySalesSegment) => void;
  periodMode: SalesPeriodMode;
  onPeriodModeChange: (mode: SalesPeriodMode) => void;
  monthlyCatalog?: OrgMonthlySalesCatalogItem[];
  monthlySummary?: OrgMonthlySalesSummary | null;
  selectedMonthKey?: string;
  onSelectMonthKey?: (monthKey: string) => void;
  monthSearchQuery?: string;
  onMonthSearchQueryChange?: (query: string) => void;
};

const SEGMENTS: {
  key: WeeklySalesSegment;
  label: string;
  hint: string;
}[] = [
  {
    key: 'weekday',
    label: '평일',
    hint: '월~금',
  },
  {
    key: 'weekend',
    label: '주말',
    hint: '토~일',
  },
];

const PERIOD_MODES: { key: SalesPeriodMode; label: string }[] = [
  { key: 'weekly', label: '이번 주 매출' },
  { key: 'monthly', label: '월별 매출' },
];

export function WeeklySalesTabBar({
  weeklySummary,
  weeklySegment,
  onWeeklySegmentChange,
  periodMode,
  onPeriodModeChange,
  monthlyCatalog = [],
  monthlySummary = null,
  selectedMonthKey,
  onSelectMonthKey,
  monthSearchQuery = '',
  onMonthSearchQueryChange,
}: WeeklySalesTabBarProps) {
  const activeMonthKey = selectedMonthKey ?? monthlyCatalog[0]?.monthKey;
  const segmentBuckets =
    periodMode === 'monthly' && monthlySummary
      ? {
          weekday: monthlySummary.weekday,
          weekend: monthlySummary.weekend,
        }
      : {
          weekday: weeklySummary.weekday,
          weekend: weeklySummary.weekend,
        };

  const periodBadge =
    periodMode === 'weekly'
      ? `이번 주 · ${weeklySummary.weekLabel}`
      : monthlySummary?.monthLabel ?? '월별';

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        {PERIOD_MODES.map(({ key, label }) => {
          const active = periodMode === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onPeriodModeChange(key)}
              style={({ pressed }) => [
                styles.modeChip,
                active && styles.modeChipActive,
                pressed && styles.modeChipPressed,
              ]}>
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.badge}>{periodBadge}</Text>

      {periodMode === 'monthly' ? (
        <>
          {onMonthSearchQueryChange ? (
            <TextInput
              onChangeText={onMonthSearchQueryChange}
              placeholder="월 검색 (예: 2026년 5월)"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={monthSearchQuery}
            />
          ) : null}
          {monthlyCatalog.length > 0 && onSelectMonthKey ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              <View style={styles.monthRow}>
                {monthlyCatalog.map((month) => {
                  const selected = month.monthKey === activeMonthKey;

                  return (
                    <Pressable
                      key={month.monthKey}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectMonthKey(month.monthKey)}
                      style={({ pressed }) => [
                        styles.monthChip,
                        selected && styles.monthChipSelected,
                        pressed && styles.monthChipPressed,
                      ]}>
                      <Text style={[styles.monthChipLabel, selected && styles.monthChipLabelSelected]}>
                        {month.label}
                      </Text>
                      <Text style={[styles.monthChipValue, selected && styles.monthChipValueSelected]}>
                        {formatAmount(month.grossSales)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <View style={styles.row}>
        {SEGMENTS.map(({ key, label, hint }) => {
          const bucket = key === 'weekend' ? segmentBuckets.weekend : segmentBuckets.weekday;
          const active = weeklySegment === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onWeeklySegmentChange(key)}
              style={({ pressed }) => [styles.cellWrap, pressed && styles.cellPressed]}>
              <View style={[styles.cell, active ? styles.cellActive : styles.cellIdle]}>
                <Text style={[styles.title, active && styles.titleActive]}>{label}</Text>
                <Text style={[styles.amount, active && styles.amountActive]}>
                  {formatAmount(bucket.grossSales)}
                </Text>
                <Text style={[styles.meta, active && styles.metaActive]}>
                  {hint} · {bucket.treatmentCount}건
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeChipActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#14B8A6',
  },
  modeChipPressed: {
    opacity: 0.92,
  },
  modeChipText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  modeChipTextActive: {
    color: '#0F766E',
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
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B2F5EA',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthScroll: {
    flexGrow: 0,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  monthChip: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthChipSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  monthChipPressed: {
    opacity: 0.92,
  },
  monthChipLabel: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '700',
  },
  monthChipLabelSelected: {
    color: '#0F766E',
  },
  monthChipValue: {
    color: '#99F6E4',
    fontSize: 13,
    fontWeight: '900',
  },
  monthChipValueSelected: {
    color: '#0F766E',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cellWrap: {
    flex: 1,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cellIdle: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
  },
  cellActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  cellPressed: {
    opacity: 0.92,
  },
  title: {
    color: '#5EEAD4',
    fontSize: 14,
    fontWeight: '900',
  },
  titleActive: {
    color: '#134E4A',
  },
  amount: {
    color: '#99F6E4',
    fontSize: 16,
    fontWeight: '900',
  },
  amountActive: {
    color: '#0F766E',
  },
  meta: {
    color: '#99F6E4',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  metaActive: {
    color: '#0F766E',
  },
});
