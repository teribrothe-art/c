import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

export type LoginEntryTabKey = 'login' | 'qr';

const TABS: { key: LoginEntryTabKey; label: string }[] = [
  { key: 'login', label: '로그인' },
  { key: 'qr', label: 'QR' },
];

type LoginEntryTabBarProps = {
  activeTab: LoginEntryTabKey;
  onSelectTab: (tab: LoginEntryTabKey) => void;
};

export function LoginEntryTabBar({ activeTab, onSelectTab }: LoginEntryTabBarProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
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
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  tabSelected: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
    color: colors.coral,
  },
});
