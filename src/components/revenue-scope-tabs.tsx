import { Pressable, StyleSheet, Text, View } from 'react-native';

const PURPLE = '#7B5EE6';

export type RevenueScopeTab = 'month' | 'week' | 'day';

type RevenueScopeTabsProps = {
  value: RevenueScopeTab;
  onChange: (tab: RevenueScopeTab) => void;
};

const TABS: { key: RevenueScopeTab; label: string }[] = [
  { key: 'month', label: '월별' },
  { key: 'week', label: '주간' },
  { key: 'day', label: '일별' },
];

export function RevenueScopeTabs({ value, onChange }: RevenueScopeTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const selected = tab.key === value;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}>
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#F0F0F5',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  tabSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabPressed: {
    opacity: 0.9,
  },
  tabText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: PURPLE,
    fontWeight: '900',
  },
});
