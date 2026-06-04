import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  DESIGNER_REGION_FILTER_TABS,
  type DesignerRegionFilterKey,
} from '../../lib/designer-region-filter';
import { colors } from '../../lib/theme';

type DesignerRegionFilterTabBarProps = {
  activeKey: DesignerRegionFilterKey;
  onSelect: (key: DesignerRegionFilterKey) => void;
};

export function DesignerRegionFilterTabBar({ activeKey, onSelect }: DesignerRegionFilterTabBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>지역별 매출 상위</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.row}>
          {DESIGNER_REGION_FILTER_TABS.map((tab) => {
            const selected = tab.key === activeKey;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onSelect(tab.key)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.chipPressed,
                ]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.purple,
  },
});
