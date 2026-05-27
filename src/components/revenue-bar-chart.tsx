import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MINT = '#00C2A8';
const CORAL = '#FF5A5F';
const PURPLE = '#7B5EE6';

export type RevenueBarChartPoint = {
  key: string;
  label: string;
  value: number;
  subLabel?: string;
  muted?: boolean;
  isToday?: boolean;
};

type RevenueBarChartProps = {
  title: string;
  points: RevenueBarChartPoint[];
  valueSuffix?: string;
  emptyMessage?: string;
  barColor?: string;
  maxBarHeight?: number;
  embedded?: boolean;
  /** embedded일 때 상위에서 제목을 쓰면 false */
  showTitle?: boolean;
  selectedKey?: string | null;
  onSelectPoint?: (point: RevenueBarChartPoint) => void;
  unitHint?: string;
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
  showTitle = true,
  selectedKey = null,
  onSelectPoint,
  unitHint,
}: RevenueBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const useHorizontalScroll = points.length > 7;
  const interactive = Boolean(onSelectPoint);
  const hint =
    unitHint ??
    (interactive ? `합계 (${valueSuffix}) · 막대를 눌러 날짜별 상세` : `합계 (${valueSuffix})`);

  const wrapperStyle = embedded ? styles.embedded : styles.card;

  if (points.length === 0) {
    return (
      <View style={wrapperStyle}>
        {showTitle ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  const chartBody = (
    <View style={[styles.chartRow, useHorizontalScroll && styles.chartRowScrollable]}>
      {points.map((point) => {
        const height = Math.max(8, Math.round((point.value / maxValue) * maxBarHeight));
        const selected = selectedKey === point.key;
        const fillColor = selected ? CORAL : point.muted ? '#B8E8DF' : barColor;

        const column = (
          <View
            style={[
              styles.barColumn,
              useHorizontalScroll && styles.barColumnFixed,
              interactive && styles.barColumnInteractive,
              point.isToday && styles.barColumnToday,
              selected && styles.barColumnSelected,
              point.muted && !selected && styles.barColumnMuted,
            ]}>
            <Text
              style={[styles.barValue, selected && styles.barValueSelected, point.muted && styles.barValueMuted]}
              numberOfLines={1}>
              {formatCompactWon(point.value)}
            </Text>
            <View style={[styles.barTrack, { height: maxBarHeight }]}>
              <View style={[styles.barFill, { height, backgroundColor: fillColor }]} />
            </View>
            <Text
              style={[styles.barLabel, selected && styles.barLabelSelected, point.muted && styles.barLabelMuted]}
              numberOfLines={1}>
              {point.label}
            </Text>
            {point.subLabel ? (
              <Text
                style={[styles.barSubLabel, selected && styles.barSubLabelSelected]}
                numberOfLines={2}>
                {point.subLabel}
              </Text>
            ) : null}
          </View>
        );

        if (!interactive) {
          return (
            <View key={point.key} style={!useHorizontalScroll ? styles.barColumnFlex : undefined}>
              {column}
            </View>
          );
        }

        return (
          <Pressable
            key={point.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelectPoint?.(point)}
            style={({ pressed }) => [
              !useHorizontalScroll ? styles.barColumnFlex : styles.barColumnFixed,
              pressed && styles.barColumnPressed,
            ]}>
            {column}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={wrapperStyle}>
      {showTitle ? <Text style={styles.title}>{title}</Text> : null}
      {useHorizontalScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartBody}
        </ScrollView>
      ) : (
        chartBody
      )}
      <Text style={styles.unitHint}>{hint}</Text>
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
  embedded: {
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
    minWidth: 28,
  },
  barColumnFlex: {
    flex: 1,
  },
  barColumnFixed: {
    width: 48,
  },
  barColumnInteractive: {
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  barColumnToday: {
    borderColor: '#FFD4D5',
  },
  barColumnSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  barColumnMuted: {
    opacity: 0.58,
  },
  barColumnPressed: {
    opacity: 0.9,
  },
  barValue: {
    color: CORAL,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  barValueSelected: {
    color: CORAL,
  },
  barValueMuted: {
    color: '#9CA3AF',
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
  barLabelSelected: {
    color: PURPLE,
  },
  barLabelMuted: {
    color: '#9CA3AF',
  },
  barSubLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 12,
    textAlign: 'center',
  },
  barSubLabelSelected: {
    color: '#6B6B7B',
  },
  unitHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
