import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DesignerClientDateGroup } from '../../lib/designer-customer-grid';
import { CustomerGrid } from './customer-grid';
import { DesignerDateOverviewGrid } from './designer-date-overview-grid';

type CustomerGridByDateProps = {
  groups: DesignerClientDateGroup[];
  onPressItem: (key: string) => void;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  /** 매장 화면 등 — 칩 강조색 */
  accent?: 'designer' | 'store';
};

const ACCENT = {
  designer: {
    chipSelectedBg: '#FFF0F0',
    chipSelectedBorder: '#FF5A5F',
    chipSelectedText: '#FF5A5F',
  },
  store: {
    chipSelectedBg: '#E0F2FE',
    chipSelectedBorder: '#0284C7',
    chipSelectedText: '#0284C7',
  },
} as const;

export function CustomerGridByDate({
  groups,
  onPressItem,
  selectedDate = null,
  onSelectDate,
  accent = 'designer',
}: CustomerGridByDateProps) {
  const accentStyle = ACCENT[accent];
  const showOverview = selectedDate === null && onSelectDate !== undefined;
  const visibleGroups = showOverview
    ? []
    : groups.filter((group) => (selectedDate === null ? true : group.date === selectedDate));

  return (
    <View style={styles.wrapper}>
      {onSelectDate && groups.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => onSelectDate(null)}
              style={({ pressed }) => [
                styles.chip,
                selectedDate === null && {
                  backgroundColor: accentStyle.chipSelectedBg,
                  borderColor: accentStyle.chipSelectedBorder,
                },
                pressed && styles.chipPressed,
              ]}>
              <Text
                style={[
                  styles.chipText,
                  selectedDate === null && { color: accentStyle.chipSelectedText },
                ]}>
                달력
              </Text>
            </Pressable>
            {groups.map((group) => {
              const active = selectedDate === group.date;

              return (
                <Pressable
                  key={group.date}
                  onPress={() => onSelectDate(group.date)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && {
                      backgroundColor: accentStyle.chipSelectedBg,
                      borderColor: accentStyle.chipSelectedBorder,
                    },
                    pressed && styles.chipPressed,
                  ]}>
                  <Text
                    style={[styles.chipText, active && { color: accentStyle.chipSelectedText }]}>
                    {group.label.split(' · ')[0]}
                  </Text>
                  <Text
                    style={[
                      styles.chipMeta,
                      active && { color: accentStyle.chipSelectedText },
                    ]}>
                    {group.count}건
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {showOverview ? (
        <DesignerDateOverviewGrid groups={groups} onPressDate={onSelectDate} />
      ) : null}

      {visibleGroups.map((group) => (
        <View key={group.date} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{group.label}</Text>
          </View>
          <CustomerGrid items={group.items} onPressItem={onPressItem} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF5A5F',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#FF5A5F',
  },
  chipMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chipMetaSelected: {
    color: '#FF5A5F',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
});
