import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { OrgMonthSettlementTotals } from '../../lib/org-month-settlement';
import { formatHqYieldRateLabel } from '../../lib/org-month-settlement';
import { colors } from '../../lib/theme';

type HqRevenueSummaryCardProps = {
  totals: OrgMonthSettlementTotals;
};

type HqRevenueTab = 'yield' | 'revenue';

export function HqRevenueSummaryCard({ totals }: HqRevenueSummaryCardProps) {
  const [tab, setTab] = useState<HqRevenueTab>('yield');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>본사 수익률 (이번 달)</Text>
      <Text style={styles.subtitle}>
        {tab === 'yield'
          ? `수수료 구조 반영 · 설정 본사 ${totals.configuredHqRate}% (매출 기준)`
          : '총 매출에서 카드·PG·디자이너·매장 분배 후 본사 몫'}
      </Text>

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
