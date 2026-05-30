import { Pressable, StyleSheet, Text, View } from 'react-native';

export type RevenueChartTabKey = 'monthly' | 'weekday';

const TABS: { key: RevenueChartTabKey; label: string }[] = [
  { key: 'monthly', label: '월별 매출' },
  { key: 'weekday', label: '요일별 합계' },
];

type RevenueChartTabBarProps = {
  activeTab: RevenueChartTabKey;
  onSelectTab: (tab: RevenueChartTabKey) => void;
};

export function RevenueChartTabBar({ activeTab, onSelectTab }: RevenueChartTabBarProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const selected = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelectTab(tab.key)}
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
    backgroundColor: '#F5F5F8',
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
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabPressed: {
    opacity: 0.92,
  },
  tabText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '800',
  },
  tabTextSelected: {
    color: '#7B5EE6',
  },
});
