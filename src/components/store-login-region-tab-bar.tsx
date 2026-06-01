import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DesignerRegionFilterKey } from '../../lib/designer-region-filter';
import { STORE_LOGIN_REGION_TABS } from '../../lib/store-login-region-filter';
import { colors } from '../../lib/theme';

type StoreLoginRegionTabBarProps = {
  activeKey: DesignerRegionFilterKey;
  onSelect: (key: DesignerRegionFilterKey) => void;
};

export function StoreLoginRegionTabBar({ activeKey, onSelect }: StoreLoginRegionTabBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>지역</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.row}>
          {STORE_LOGIN_REGION_TABS.map((tab) => {
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
    gap: 4,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    paddingHorizontal: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipText: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.coral,
    fontWeight: '900',
  },
});
