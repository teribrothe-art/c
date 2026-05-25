import { ScrollView, StyleSheet, Text, View } from 'react-native';

const MINT = '#00C2A8';
const CORAL = '#FF5A5F';

export type RevenueBarChartPoint = {
  key: string;
  label: string;
  value: number;
  subLabel?: string;
};

type RevenueBarChartProps = {
  title: string;
  points: RevenueBarChartPoint[];
  valueSuffix?: string;
  emptyMessage?: string;
  barColor?: string;
  maxBarHeight?: number;
};

function formatCompactWon(value: number) {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }

  return value.toLocaleString('ko-KR');
}

export function RevenueBarChart({
  title,
  points,
  valueSuffix = '원',
  emptyMessage = '표시할 데이터가 없어요',
  barColor = MINT,
  maxBarHeight = 120,
}: RevenueBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const useHorizontalScroll = points.length > 7;

  if (points.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  const chartBody = (
    <View style={[styles.chartRow, useHorizontalScroll && styles.chartRowScrollable]}>
      {points.map((point) => {
        const height = Math.max(8, Math.round((point.value / maxValue) * maxBarHeight));

        return (
          <View
            key={point.key}
            style={[styles.barColumn, useHorizontalScroll && styles.barColumnFixed]}>
            <Text style={styles.barValue} numberOfLines={1}>
              {formatCompactWon(point.value)}
            </Text>
            <View style={[styles.barTrack, { height: maxBarHeight }]}>
              <View style={[styles.barFill, { height, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {point.label}
            </Text>
            {point.subLabel ? (
              <Text style={styles.barSubLabel} numberOfLines={1}>
                {point.subLabel}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {useHorizontalScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartBody}
        </ScrollView>
      ) : (
        chartBody
      )}
      <Text style={styles.unitHint}>합계 ({valueSuffix})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 12,
    padding: 16,
    elevation: 3,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  empty: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 24,
    textAlign: 'center',
  },
  chartRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  chartRowScrollable: {
    gap: 10,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 28,
  },
  barColumnFixed: {
    flex: 0,
    width: 44,
  },
  barValue: {
    color: CORAL,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  barTrack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  barFill: {
    borderRadius: 8,
    minHeight: 8,
    width: '72%',
  },
  barLabel: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  barSubLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  unitHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
