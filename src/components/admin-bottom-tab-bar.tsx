import { Href, Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../lib/theme';

const tabs: { href: Href; label: string }[] = [
  { href: '/admin' as Href, label: '홈' },
  { href: '/admin/designers' as Href, label: '매장' },
  { href: '/admin/reservations' as Href, label: '예약' },
  { href: '/admin/revenue' as Href, label: '매출' },
  { href: '/admin/profile' as Href, label: '계정' },
];

export function AdminBottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const href = String(tab.href);
          const selected =
            pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

          return (
            <Link href={tab.href} key={href} asChild>
              <Pressable accessibilityRole="button" hitSlop={6} style={styles.tabItem}>
                <View style={[styles.tabDot, selected && styles.tabDotSelected]} />
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                  {tab.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 24,
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  tabDotSelected: {
    backgroundColor: colors.purple,
  },
  tabLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelSelected: {
    color: colors.purple,
  },
});
