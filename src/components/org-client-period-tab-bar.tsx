import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrgClientListItem } from '../../lib/org-client-list';
import {
  buildClientDayTabs,
  buildClientMonthTabs,
  buildClientWeekTabs,
  type ClientPeriodSelection,
  type ClientPeriodTab,
} from '../../lib/org-client-period-tabs';

const MONTHS_PER_PAGE = 4;

type OrgClientPeriodTabBarProps = {
  items: OrgClientListItem[];
  selection: ClientPeriodSelection;
  onSelectionChange: (selection: ClientPeriodSelection) => void;
};

type PeriodLevel = 'month' | 'week' | 'day';

function PeriodTabRow({
  level,
  tabs,
  selectedKey,
  onSelect,
}: {
  level: PeriodLevel;
  tabs: ClientPeriodTab[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const levelLabel = level === 'month' ? '월' : level === 'week' ? '주' : '일';

  return (
    <View style={styles.levelBlock}>
      <Text style={styles.levelLabel}>{levelLabel}</Text>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const selected = tab.key === selectedKey;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(tab.key)}
              style={({ pressed }) => [
                styles.tabChip,
                selected && styles.tabChipSelected,
                pressed && styles.tabChipPressed,
              ]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
                {tab.label}
              </Text>
              <Text style={[styles.tabMeta, selected && styles.tabMetaSelected]}>{tab.count}건</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MonthPagerRow({
  tabs,
  selectedKey,
  onSelect,
}: {
  tabs: ClientPeriodTab[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(tabs.length / MONTHS_PER_PAGE));
  const [page, setPage] = useState(0);
  const pageIndex = Math.min(page, pageCount - 1);
  const visibleTabs = tabs.slice(pageIndex * MONTHS_PER_PAGE, pageIndex * MONTHS_PER_PAGE + MONTHS_PER_PAGE);
  const canGoPrev = pageIndex > 0;
  const canGoNext = pageIndex < pageCount - 1;

  useEffect(() => {
    if (!selectedKey) {
      return;
    }

    const selectedIndex = tabs.findIndex((tab) => tab.key === selectedKey);

    if (selectedIndex >= 0) {
      setPage(Math.floor(selectedIndex / MONTHS_PER_PAGE));
    }
  }, [selectedKey, tabs]);

  return (
    <View style={styles.levelBlock}>
      <Text style={styles.levelLabel}>월</Text>
      <View style={styles.monthRow}>
        {visibleTabs.map((tab) => {
          const selected = tab.key === selectedKey;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(tab.key)}
              style={({ pressed }) => [
                styles.tabChip,
                styles.tabChipMonth,
                selected && styles.tabChipSelected,
                pressed && styles.tabChipPressed,
              ]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
                {tab.label}
              </Text>
              <Text style={[styles.tabMeta, selected && styles.tabMetaSelected]}>{tab.count}건</Text>
            </Pressable>
          );
        })}
      </View>
      {pageCount > 1 ? (
        <View style={styles.pagerRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoPrev}
            onPress={() => setPage((current) => Math.max(0, current - 1))}
            style={({ pressed }) => [
              styles.pagerButton,
              !canGoPrev && styles.pagerButtonDisabled,
              pressed && canGoPrev && styles.tabChipPressed,
            ]}>
            <Text style={[styles.pagerButtonText, !canGoPrev && styles.pagerButtonTextDisabled]}>이전</Text>
          </Pressable>
          <Text style={styles.pagerIndicator}>
            {pageIndex + 1} / {pageCount}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoNext}
            onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            style={({ pressed }) => [
              styles.pagerButton,
              !canGoNext && styles.pagerButtonDisabled,
              pressed && canGoNext && styles.tabChipPressed,
            ]}>
            <Text style={[styles.pagerButtonText, !canGoNext && styles.pagerButtonTextDisabled]}>다음</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function OrgClientPeriodTabBar({ items, selection, onSelectionChange }: OrgClientPeriodTabBarProps) {
  const monthTabs = useMemo(() => buildClientMonthTabs(items), [items]);
  const weekTabs = useMemo(
    () => (selection.monthKey ? buildClientWeekTabs(items, selection.monthKey) : []),
    [items, selection.monthKey],
  );
  const dayTabs = useMemo(
    () => (selection.weekKey ? buildClientDayTabs(items, selection.weekKey) : []),
    [items, selection.weekKey],
  );

  const handleSelectMonth = (monthKey: string) => {
    if (selection.monthKey === monthKey && !selection.weekKey && !selection.date) {
      onSelectionChange({ monthKey: null, weekKey: null, date: null });
      return;
    }

    onSelectionChange({ monthKey, weekKey: null, date: null });
  };

  const handleSelectWeek = (weekKey: string) => {
    if (selection.weekKey === weekKey && !selection.date) {
      onSelectionChange({ monthKey: selection.monthKey, weekKey: null, date: null });
      return;
    }

    onSelectionChange({ monthKey: selection.monthKey, weekKey, date: null });
  };

  const handleSelectDay = (date: string) => {
    if (selection.date === date) {
      onSelectionChange({ monthKey: selection.monthKey, weekKey: selection.weekKey, date: null });
      return;
    }

    onSelectionChange({ monthKey: selection.monthKey, weekKey: selection.weekKey, date });
  };

  if (monthTabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MonthPagerRow
        selectedKey={selection.monthKey}
        tabs={monthTabs}
        onSelect={handleSelectMonth}
      />

      {selection.monthKey && weekTabs.length > 0 ? (
        <PeriodTabRow
          level="week"
          selectedKey={selection.weekKey}
          tabs={weekTabs}
          onSelect={handleSelectWeek}
        />
      ) : null}

      {selection.weekKey && dayTabs.length > 0 ? (
        <PeriodTabRow
          level="day"
          selectedKey={selection.date}
          tabs={dayTabs}
          onSelect={handleSelectDay}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  levelBlock: {
    gap: 6,
  },
  levelLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabChipMonth: {
    flex: 1,
    minWidth: 0,
  },
  tabChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  tabChipPressed: {
    opacity: 0.92,
  },
  tabLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  tabLabelSelected: {
    color: '#0284C7',
  },
  tabMeta: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  tabMetaSelected: {
    color: '#0369A1',
  },
  pagerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  pagerButton: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pagerButtonDisabled: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
  },
  pagerButtonText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  pagerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pagerIndicator: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
