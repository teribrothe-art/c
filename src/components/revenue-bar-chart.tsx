import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MINT = '#00C2A8';
const CORAL = '#FF5A5F';

export type RevenueBarChartPoint = {
  key: string;
  label: string;
  value: number;
  subLabel?: string;
};

type RevenueBarChartProps = {
  title?: string;
  points: RevenueBarChartPoint[];
  valueSuffix?: string;
  emptyMessage?: string;
  barColor?: string;
  maxBarHeight?: number;
  embedded?: boolean;
  selectedKey?: string | null;
  onPressPoint?: (key: string) => void;
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
  embedded = false,
  selectedKey = null,
  onPressPoint,
}: RevenueBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const useHorizontalScroll = points.length > 7;

  if (points.length === 0) {
    const emptyWrapStyle = embedded ? styles.embeddedBlock : styles.card;

    return (
      <View style={emptyWrapStyle}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  const chartBody = (
    <View style={[styles.chartRow, useHorizontalScroll && styles.chartRowScrollable]}>
      {points.map((point) => {
        const height = Math.max(8, Math.round((point.value / maxValue) * maxBarHeight));
        const selected = selectedKey === point.key;
        const column = (
          <>
            <Text style={[styles.barValue, selected && styles.barValueSelected]} numberOfLines={1}>
              {formatCompactWon(point.value)}
            </Text>
            <View style={[styles.barTrack, { height: maxBarHeight }]}>
              <View
                style={[
                  styles.barFill,
                  { height, backgroundColor: barColor },
                  selected && styles.barFillSelected,
                ]}
              />
            </View>
            <Text style={[styles.barLabel, selected && styles.barLabelSelected]} numberOfLines={1}>
              {point.label}
            </Text>
            {point.subLabel ? (
              <Text style={[styles.barSubLabel, selected && styles.barSubLabelSelected]} numberOfLines={1}>
                {point.subLabel}
              </Text>
            ) : null}
          </>
        );

        if (!onPressPoint) {
          return (
            <View
              key={point.key}
              style={[styles.barColumn, useHorizontalScroll && styles.barColumnFixed]}>
              {column}
            </View>
          );
        }

        return (
          <Pressable
            key={point.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onPressPoint(point.key)}
            style={({ pressed }) => [
              styles.barColumn,
              useHorizontalScroll && styles.barColumnFixed,
              selected && styles.barColumnSelected,
              pressed && styles.barColumnPressed,
            ]}>
            {column}
          </Pressable>
        );
      })}
    </View>
  );

  const chartContent = useHorizontalScroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {chartBody}
    </ScrollView>
  ) : (
    chartBody
  );

  if (embedded) {
    return (
      <View style={styles.embeddedBlock}>
        {chartContent}
        <Text style={styles.unitHint}>합계 ({valueSuffix})</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {chartContent}
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
  embeddedBlock: {
    gap: 12,
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
    borderRadius: 10,
    flex: 1,
    minWidth: 28,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  barColumnSelected: {
    backgroundColor: '#F0EBFF',
  },
  barColumnPressed: {
    opacity: 0.9,
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
  barValueSelected: {
    color: '#FF5A5F',
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
  barFillSelected: {
    opacity: 1,
  },
  barLabel: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  barLabelSelected: {
    color: '#7B5EE6',
    fontWeight: '800',
  },
  barSubLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  barSubLabelSelected: {
    color: '#7B5EE6',
  },
  unitHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
