import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import type { MonthlySettlementTotal } from '../../lib/designer-payment-stats';

const PAGE_SIZE = 4;
const PURPLE = '#7B5EE6';

type MonthlySettlementGridProps = {
  items: MonthlySettlementTotal[];
  onPressItem: (monthKey: string) => void;
  onPressAll?: () => void;
};

function formatTileAmount(amount: number) {
  if (amount >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만`;
  }

  return amount.toLocaleString('ko-KR');
}

function formatTileMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');

  return `${year}년 ${Number(month)}월`;
}

export function MonthlySettlementGrid({ items, onPressItem, onPressAll }: MonthlySettlementGridProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = useMemo(
    () => items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [items, safePage],
  );

  const canGoPrev = safePage > 0;
  const canGoNext = safePage < pageCount - 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: false }}
          onPress={onPressAll}
          style={({ pressed }) => [styles.allChip, pressed && styles.chipPressed]}>
          <Text style={styles.allChipText}>전체</Text>
        </Pressable>

        {pageCount > 1 ? (
          <View style={styles.pager}>
            <Pressable
              accessibilityLabel="이전 4개월"
              disabled={!canGoPrev}
              onPress={() => setPage((current) => Math.max(0, current - 1))}
              style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.pageLabel}>
              {safePage + 1} / {pageCount}
            </Text>
            <Pressable
              accessibilityLabel="다음 4개월"
              disabled={!canGoNext}
              onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        {visibleItems.map((item) => (
          <View key={item.monthKey} style={styles.tileWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label} ${formatAmount(item.amount)}`}
              onPress={() => onPressItem(item.monthKey)}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
              <Text style={styles.monthLabel} numberOfLines={2}>
                {formatTileMonthLabel(item.monthKey)}
              </Text>
              <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatTileAmount(item.amount)}
              </Text>
              <Text style={styles.meta}>{item.settlementCount}건</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allChip: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  allChipText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '800',
  },
  chipPressed: {
    opacity: 0.9,
  },
  pager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '700',
  },
  pageLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  tileWrap: {
    aspectRatio: 1,
    flex: 1,
    maxWidth: '25%',
    padding: 4,
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
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  amount: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
});
