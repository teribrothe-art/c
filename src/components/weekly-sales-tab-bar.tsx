import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { OrgWeeklySalesSummary, WeeklySalesSegment } from '../../lib/org-weekly-sales';

type WeeklySalesTabBarProps = {
  summary: OrgWeeklySalesSummary;
  segment: WeeklySalesSegment;
  onSegmentChange: (segment: WeeklySalesSegment) => void;
};

const SEGMENTS: {
  key: WeeklySalesSegment;
  label: string;
  hint: string;
}[] = [
  {
    key: 'weekday',
    label: '평일 매출',
    hint: '월~금 · 이번 주 실제',
  },
  {
    key: 'weekend',
    label: '주말 매출',
    hint: '토~일 · 이번 주 실제',
  },
];

export function WeeklySalesTabBar({ summary, segment, onSegmentChange }: WeeklySalesTabBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>이번 주 매출 · {summary.weekLabel}</Text>
      <View style={styles.row}>
        {SEGMENTS.map(({ key, label, hint }) => {
          const bucket = key === 'weekend' ? summary.weekend : summary.weekday;
          const active = segment === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSegmentChange(key)}
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
