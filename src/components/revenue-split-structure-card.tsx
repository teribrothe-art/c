import { type Href, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type RevenueSplitConfig } from '../../lib/revenue-split-config';
import { getActiveRevenueSplitConfig, getPendingRevenueSplitProposal } from '../../lib/revenue-split-approval';
import { colors } from '../../lib/theme';

type RevenueSplitStructureCardProps = {
  editHref?: Href;
  /** @deprecated 상세 접기 UI만 사용 — 예시 계산 미표시 */
  sampleGrossAmount?: number;
};

export function RevenueSplitStructureCard({
  editHref = '/admin/revenue-split',
}: RevenueSplitStructureCardProps) {
  const [config, setConfig] = useState<RevenueSplitConfig | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.headerButton, pressed && styles.headerPressed]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>수수료 구조</Text>
          <View style={styles.headerTrailing}>
            {hasPending ? <Text style={styles.pendingBadge}>승인 대기</Text> : null}
            <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
          </View>
        </View>
        {!expanded ? (
          <Text style={styles.collapsedHint}>탭하여 수수료 비율 보기</Text>
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>카드 수수료(카드사)</Text>
            <Text style={styles.rowValue}>{config.cardFeePercent}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PG 수수료</Text>
            <Text style={styles.rowValue}>{config.pgFeePercent}%</Text>
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
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(editHref)}
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}>
            <Text style={styles.link}>비율 조정 · 상호 승인 ›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 14,
  },
  headerButton: {
    gap: 4,
  },
  headerPressed: {
    opacity: 0.92,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTrailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  chevron: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  collapsedHint: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    borderTopColor: '#F0F0F4',
    borderTopWidth: 1,
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
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
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  linkPressed: {
    opacity: 0.9,
  },
  link: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
  },
});
