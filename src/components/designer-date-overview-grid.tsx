import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DesignerClientDateGroup } from '../../lib/designer-customer-grid';

const PAGE_SIZE = 4;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

type DesignerDateOverviewGridProps = {
  groups: DesignerClientDateGroup[];
  onPressDate: (date: string) => void;
};

function formatDayTile(date: string) {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  const now = new Date();
  const showYear = year !== now.getFullYear();

  return {
    dayNumber: day,
    weekday,
    caption: showYear ? `${year}.${String(month).padStart(2, '0')}` : `${month}월`,
  };
}

export function DesignerDateOverviewGrid({ groups, onPressDate }: DesignerDateOverviewGridProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  const visibleGroups = useMemo(
    () => groups.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [groups, safePage],
  );

  const canGoPrev = safePage > 0;
  const canGoNext = safePage < pageCount - 1;

  useEffect(() => {
    setPage(0);
  }, [groups.length]);

  return (
    <View style={styles.wrap}>
      {pageCount > 1 ? (
        <View style={styles.toolbar}>
          <Text style={styles.hint}>날짜를 눌러 시술 목록 보기</Text>
          <View style={styles.pager}>
            <Pressable
              accessibilityLabel="이전 4일"
              disabled={!canGoPrev}
              onPress={() => setPage((current) => Math.max(0, current - 1))}
              style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.pageLabel}>
              {safePage + 1} / {pageCount}
            </Text>
            <Pressable
              accessibilityLabel="다음 4일"
              disabled={!canGoNext}
              onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.hintStandalone}>날짜를 눌러 시술 목록 보기</Text>
      )}

      <View style={styles.grid}>
        {visibleGroups.map((group) => {
          const tile = formatDayTile(group.date);

          return (
            <View key={group.date} style={styles.tileWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${group.label} 시술 보기`}
                onPress={() => onPressDate(group.date)}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
                <Text style={styles.caption}>{tile.caption}</Text>
                <Text style={styles.dayNumber}>{tile.dayNumber}</Text>
                <Text style={styles.weekday}>{tile.weekday}</Text>
                <Text style={styles.count}>{group.count}건</Text>
              </Pressable>
            </View>
          );
        })}
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
  hint: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  hintStandalone: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  pager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tilePressed: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF5A5F',
    opacity: 0.95,
  },
  caption: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayNumber: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  weekday: {
    color: '#FF5A5F',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  count: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
});
