import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MonthlySettlementTotal } from '../../lib/designer-payment-stats';

type MonthlySettlementGridProps = {
  items: MonthlySettlementTotal[];
  onPressItem: (monthKey: string) => void;
};

function formatTileAmount(amount: number) {
  if (amount >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만`;
  }

  return amount.toLocaleString('ko-KR');
}

function getShortMonthLabel(label: string) {
  return label.replace(/\s정산.*$/, '');
}

export function MonthlySettlementGrid({ items, onPressItem }: MonthlySettlementGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.monthKey} style={styles.tileWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${item.amount.toLocaleString('ko-KR')}원`}
            onPress={() => onPressItem(item.monthKey)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
            <Text style={styles.monthLabel}>{getShortMonthLabel(item.label)}</Text>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatTileAmount(item.amount)}
            </Text>
            <Text style={styles.amountUnit}>원</Text>
            <Text style={styles.meta}>{item.settlementCount}건</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 4,
  },
  tileWrap: {
    aspectRatio: 1,
    padding: 4,
    width: '25%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tilePressed: {
    backgroundColor: '#EFEFF4',
    borderColor: '#D1D5DB',
    opacity: 0.92,
  },
  monthLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  amount: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  amountUnit: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
});
