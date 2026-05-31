import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { HqMonthlyRevenueBucket } from '../../lib/org-hq-revenue-history';
import type { OrgMonthSettlementTotals } from '../../lib/org-month-settlement';
import { formatHqYieldRateLabel } from '../../lib/org-month-settlement';
import { colors } from '../../lib/theme';

type HqRevenueSummaryCardProps = {
  totals: OrgMonthSettlementTotals;
  months?: HqMonthlyRevenueBucket[];
  selectedMonthKey?: string;
  onSelectMonth?: (monthKey: string) => void;
};

type HqRevenueTab = 'yield' | 'revenue';

export function HqRevenueSummaryCard({
  totals,
  months = [],
  selectedMonthKey,
  onSelectMonth,
}: HqRevenueSummaryCardProps) {
  const [tab, setTab] = useState<HqRevenueTab>('yield');
  const selectedMonth =
    months.find((month) => month.monthKey === selectedMonthKey) ??
    months[0] ??
    null;
  const monthLabel = selectedMonth?.label ?? '이번 달';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>본사 수익률 ({monthLabel})</Text>
      <Text style={styles.subtitle}>
        {tab === 'yield'
          ? `수수료 구조 반영 · 설정 본사 ${totals.configuredHqRate}% (매출 기준)`
          : '총 매출에서 카드·PG·디자이너·매장 분배 후 본사 몫'}
      </Text>

      {months.length > 1 && onSelectMonth ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
          <View style={styles.monthRow}>
            {months.map((month) => {
              const selected = month.monthKey === (selectedMonthKey ?? months[0]?.monthKey);

              return (
                <Pressable
                  key={month.monthKey}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelectMonth(month.monthKey)}
                  style={({ pressed }) => [
                    styles.monthChip,
                    selected && styles.monthChipSelected,
                    pressed && styles.monthChipPressed,
                  ]}>
                  <Text style={[styles.monthChipLabel, selected && styles.monthChipLabelSelected]}>
                    {month.label}
                  </Text>
                  <Text style={[styles.monthChipValue, selected && styles.monthChipValueSelected]}>
                    {formatAmount(month.monthHqRevenue)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.heroRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'yield' }}
          onPress={() => setTab('yield')}
          style={({ pressed }) => [styles.heroCellWrap, pressed && styles.heroCellPressed]}>
          <View style={[styles.heroBlock, tab === 'yield' && styles.heroBlockActive]}>
            <Text style={[styles.heroLabel, tab === 'yield' && styles.heroLabelActive]}>
              본사 수익률
            </Text>
            <Text style={[styles.heroValue, tab === 'yield' && styles.heroValueActive]}>
              {formatHqYieldRateLabel(totals)}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'revenue' }}
          onPress={() => setTab('revenue')}
          style={({ pressed }) => [styles.heroCellWrap, pressed && styles.heroCellPressed]}>
          <View style={[styles.heroBlock, tab === 'revenue' && styles.heroBlockActive]}>
            <Text style={[styles.heroLabel, tab === 'revenue' && styles.heroLabelActive]}>
              본사 수익
            </Text>
            <Text style={[styles.heroValue, tab === 'revenue' && styles.heroValueActive]}>
              {formatAmount(totals.monthHqRevenue)}
            </Text>
          </View>
        </Pressable>
      </View>

      {tab === 'yield' ? (
        <View style={styles.breakdown}>
          <Row label="설정 본사율" value={`${totals.configuredHqRate}%`} />
          <Row label="실효 수익률" value={formatHqYieldRateLabel(totals)} />
          <Row label="총 매출" value={formatAmount(totals.monthGrossSales)} />
        </View>
      ) : (
        <View style={styles.breakdown}>
          <Row label="총 매출" value={formatAmount(totals.monthGrossSales)} />
          <Row label="카드 수수료" value={`-${formatAmount(totals.monthCardFee)}`} />
          <Row label="PG 수수료" value={`-${formatAmount(totals.monthPgFee)}`} />
          <Row label="디자이너 분배" value={formatAmount(totals.monthDesignerPayout)} />
          <Row label="매장 분배" value={formatAmount(totals.monthStoreShare)} />
          <Row label="본사 수익" value={formatAmount(totals.monthHqRevenue)} emphasis />
        </View>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowLabelEmphasis]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D7FA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  title: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
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
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  monthChipPressed: {
    opacity: 0.92,
  },
  monthChipLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  monthChipLabelSelected: {
    color: colors.purple,
  },
  monthChipValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
  },
  monthChipValueSelected: {
    color: colors.purple,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCellWrap: {
    flex: 1,
  },
  heroCellPressed: {
    opacity: 0.92,
  },
  heroBlock: {
    backgroundColor: '#F7F4FF',
    borderColor: '#F7F4FF',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  heroBlockActive: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  heroLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  heroLabelActive: {
    color: colors.purple,
  },
  heroValue: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  heroValueActive: {
    color: colors.purple,
  },
  breakdown: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  rowLabelEmphasis: {
    color: '#1A1A2E',
    fontWeight: '800',
  },
  rowValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  rowValueEmphasis: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '900',
  },
});
