import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import {
  calculateRevenueSplit,
  formatRevenueSplitSummary,
  type RevenueSplitConfig,
} from '../../lib/revenue-split-config';
import { getActiveRevenueSplitConfig, getPendingRevenueSplitProposal } from '../../lib/revenue-split-approval';
import { colors } from '../../lib/theme';

type RevenueSplitStructureCardProps = {
  sampleGrossAmount?: number;
};

export function RevenueSplitStructureCard({ sampleGrossAmount = 100_000 }: RevenueSplitStructureCardProps) {
  const [config, setConfig] = useState<RevenueSplitConfig | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const load = useCallback(() => {
    Promise.all([getActiveRevenueSplitConfig(), getPendingRevenueSplitProposal()]).then(
      ([active, pending]) => {
        setConfig(active);
        setHasPending(Boolean(pending));
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!config) {
    return null;
  }

  const sample = calculateRevenueSplit(sampleGrossAmount, config);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/admin/revenue-split')}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>수수료 구조</Text>
        {hasPending ? <Text style={styles.pendingBadge}>승인 대기</Text> : null}
      </View>
      <Text style={styles.summary}>{formatRevenueSplitSummary(config)}</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>카드 수수료(제외)</Text>
        <Text style={styles.rowValue}>{config.cardFeePercent}%</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>본사(매출)</Text>
        <Text style={styles.rowValue}>{config.hqFeePercent}%</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>디자이너 · 매장</Text>
        <Text style={styles.rowValue}>
          {config.designerSharePercent}:{config.storeSharePercent}
        </Text>
      </View>
      <Text style={styles.example}>
        예: 시술 {formatAmount(sampleGrossAmount)} → 디자이너 {formatAmount(sample.designerPayout)} · 매장{' '}
        {formatAmount(sample.storePayout)} (본사 {formatAmount(sample.hqFeeAmount)})
      </Text>
      <Text style={styles.link}>비율 조정 · 상호 승인 ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.94,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  pendingBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 999,
    color: colors.coral,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summary: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
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
  example: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
  },
  link: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
});
