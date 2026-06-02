import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  TREATMENT_INPUT_TABS,
  type TreatmentInputTabKey,
} from '../../lib/designer-treatment-input-tabs';

type TreatmentInputTabBarProps = {
  activeTab: TreatmentInputTabKey;
  onSelectTab: (tab: TreatmentInputTabKey) => void;
};

export function TreatmentInputTabBar({ activeTab, onSelectTab }: TreatmentInputTabBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        {TREATMENT_INPUT_TABS.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectTab(tab.key)}
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
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
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
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#FF5A5F',
  },
});
