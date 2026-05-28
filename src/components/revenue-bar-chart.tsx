import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MINT = '#00C2A8';
const CORAL = '#FF5A5F';
const PURPLE = '#7B5EE6';

export type RevenueBarChartPoint = {
  key: string;
  label: string;
  value: number;
  subLabel?: string;
  dateLabel?: string;
  selected?: boolean;
  dimmed?: boolean;
  isToday?: boolean;
  barColor?: string;
};

type RevenueBarChartProps = {
  title?: string;
  points: RevenueBarChartPoint[];
  valueSuffix?: string;
  emptyMessage?: string;
  barColor?: string;
  selectedBarColor?: string;
  maxBarHeight?: number;
  embedded?: boolean;
  onSelectPoint?: (key: string) => void;
};

function formatCompactWon(value: number, valueSuffix?: string) {
  if (valueSuffix === '건') {
    return `${value.toLocaleString('ko-KR')}건`;
  }

  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }

  if (value <= 0) {
    return '0';
  }

  return value.toLocaleString('ko-KR');
}

export function RevenueBarChart({
  title,
  points,
  valueSuffix = '원',
  emptyMessage = '표시할 데이터가 없어요',
  barColor = MINT,
  selectedBarColor = PURPLE,
  maxBarHeight = 120,
  embedded = false,
  onSelectPoint,
}: RevenueBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const useHorizontalScroll = points.length > 7;
  const interactive = Boolean(onSelectPoint);

  if (points.length === 0) {
    return (
      <View style={[styles.card, embedded && styles.cardEmbedded]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  const chartBody = (
    <View style={[styles.chartRow, useHorizontalScroll && styles.chartRowScrollable]}>
      {points.map((point) => {
        const height = Math.max(8, Math.round((point.value / maxValue) * maxBarHeight));
        const selected = Boolean(point.selected);
        const fillColor = selected ? selectedBarColor : (point.barColor ?? barColor);

        const column = (
          <>
            <Text
              style={[styles.barValue, selected && styles.barValueSelected]}
              numberOfLines={1}>
              {point.value > 0 ? formatCompactWon(point.value, valueSuffix) : valueSuffix === '건' ? '0건' : '0'}
            </Text>
            <View style={[styles.barTrack, { height: maxBarHeight }]}>
              <View style={[styles.barFill, { height, backgroundColor: fillColor }]} />
            </View>
            <Text style={[styles.barLabel, selected && styles.barLabelSelected]} numberOfLines={1}>
              {point.label}
            </Text>
            {point.subLabel ? (
              <Text style={styles.barSubLabel} numberOfLines={1}>
                {point.subLabel}
              </Text>
            ) : null}
            {point.dateLabel ? (
              <Text style={[styles.barDateLabel, selected && styles.barDateLabelSelected]} numberOfLines={1}>
                {point.dateLabel}
              </Text>
            ) : null}
          </>
        );

        const columnStyle = [
          styles.barColumn,
          useHorizontalScroll && styles.barColumnFixed,
          point.dimmed && styles.barColumnDimmed,
          point.isToday && !selected && styles.barColumnToday,
          selected && styles.barColumnSelected,
        ];

        if (interactive) {
          return (
            <Pressable
              key={point.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectPoint?.(point.key)}
              style={({ pressed }) => [
                ...columnStyle,
                pressed && styles.barColumnPressed,
              ]}>
              {column}
            </Pressable>
          );
        }

        return (
          <View key={point.key} style={columnStyle}>
            {column}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {useHorizontalScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartBody}
        </ScrollView>
      ) : (
        chartBody
      )}
      {interactive || !embedded ? (
        <Text style={styles.unitHint}>
          {interactive
            ? `합계 (${valueSuffix}) · 막대를 누르면 상세를 볼 수 있어요`
            : `합계 (${valueSuffix})`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 12,
    padding: 16,
  },
  cardEmbedded: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    elevation: 0,
    padding: 0,
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
    gap: 4,
    justifyContent: 'space-between',
  },
  chartRowScrollable: {
    gap: 10,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    minWidth: 36,
    paddingBottom: 4,
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  barColumnFixed: {
    flex: 0,
    width: 48,
  },
  barColumnDimmed: {
    opacity: 0.55,
  },
  barColumnToday: {
    borderColor: '#FFD4D5',
  },
  barColumnSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  barColumnPressed: {
    opacity: 0.9,
  },
  barValue: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  barValueSelected: {
    color: CORAL,
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
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  barLabelSelected: {
    color: PURPLE,
  },
  barSubLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  barDateLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  barDateLabelSelected: {
    color: '#6B6B7B',
  },
  unitHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
