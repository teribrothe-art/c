import { StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { OrgMonthSettlementTotals } from '../../lib/org-month-settlement';
import { formatHqYieldRateLabel } from '../../lib/org-month-settlement';
import { colors } from '../../lib/theme';

type HqRevenueSummaryCardProps = {
  totals: OrgMonthSettlementTotals;
};

export function HqRevenueSummaryCard({ totals }: HqRevenueSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>본사 수익률 (이번 달)</Text>
      <Text style={styles.subtitle}>
        수수료 구조 반영 · 설정 본사 {totals.configuredHqRate}% (매출 기준)
      </Text>

      <View style={styles.heroRow}>
        <View style={styles.heroBlock}>
          <Text style={styles.heroLabel}>본사 수익률</Text>
          <Text style={styles.heroValue}>{formatHqYieldRateLabel(totals)}</Text>
        </View>
        <View style={styles.heroBlock}>
          <Text style={styles.heroLabel}>본사 수익</Text>
          <Text style={styles.heroValue}>{formatAmount(totals.monthHqRevenue)}</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <Row label="총 매출" value={formatAmount(totals.monthGrossSales)} />
        <Row label="카드 수수료" value={`-${formatAmount(totals.monthCardFee)}`} />
        <Row label="PG 수수료" value={`-${formatAmount(totals.monthPgFee)}`} />
        <Row label="디자이너 분배" value={formatAmount(totals.monthDesignerPayout)} />
        <Row label="매장 분배" value={formatAmount(totals.monthStoreShare)} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  heroBlock: {
    backgroundColor: '#F7F4FF',
    borderRadius: 12,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  heroLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  heroValue: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
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
  rowValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
});
