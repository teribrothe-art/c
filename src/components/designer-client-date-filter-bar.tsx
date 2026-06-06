import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  canShiftDesignerClientDateFilterBackward,
  canShiftDesignerClientDateFilterForward,
  formatDesignerClientDateFilterLabel,
  shiftDesignerClientDateFilter,
  type DesignerClientDateFilter,
  type DesignerClientDateFilterMode,
} from '../../lib/designer-client-date-filter';
import type { DesignerClientListItem } from '../../lib/customer-invitations';
import { RevenuePeriodNavigator } from './revenue-period-navigator';

const DATE_FILTER_MODES: { key: DesignerClientDateFilterMode; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'year', label: '년' },
  { key: 'month', label: '월' },
  { key: 'day', label: '일' },
];

type DesignerClientDateFilterBarProps = {
  filter: DesignerClientDateFilter;
  items: DesignerClientListItem[];
  matchCount: number;
  onChange: (filter: DesignerClientDateFilter) => void;
};

export function DesignerClientDateFilterBar({
  filter,
  items,
  matchCount,
  onChange,
}: DesignerClientDateFilterBarProps) {
  const handleSelectMode = (mode: DesignerClientDateFilterMode) => {
    onChange({ ...filter, mode });
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
        <View style={styles.modeRow}>
          {DATE_FILTER_MODES.map((mode) => {
            const active = filter.mode === mode.key;

            return (
              <Pressable
                key={mode.key}
                onPress={() => handleSelectMode(mode.key)}
                style={({ pressed }) => [
                  styles.modeChip,
                  active && styles.modeChipSelected,
                  pressed && styles.chipPressed,
                ]}>
                <Text style={[styles.modeChipText, active && styles.modeChipTextSelected]}>
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {filter.mode === 'all' ? (
        <Text style={styles.summaryLine}>전체 시술 {matchCount.toLocaleString('ko-KR')}건</Text>
      ) : (
        <View style={styles.navigatorWrap}>
          <RevenuePeriodNavigator
            canNext={canShiftDesignerClientDateFilterForward(filter)}
            canPrevious={canShiftDesignerClientDateFilterBackward(filter, items)}
            label={formatDesignerClientDateFilterLabel(filter)}
            onNext={() => onChange(shiftDesignerClientDateFilter(filter, 1))}
            onPrevious={() => onChange(shiftDesignerClientDateFilter(filter, -1))}
          />
          <Text style={styles.summaryLine}>{matchCount.toLocaleString('ko-KR')}건</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 12,
  },
  modeScroll: {
    flexGrow: 0,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modeChipSelected: {
    backgroundColor: '#E8FAF7',
    borderColor: '#00C2A8',
  },
  chipPressed: {
    opacity: 0.9,
  },
  modeChipText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  modeChipTextSelected: {
    color: '#00A88E',
  },
  navigatorWrap: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryLine: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
