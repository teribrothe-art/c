import { Href, Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs: { href: Href; label: string }[] = [
  { href: '/designer/clients' as Href, label: '고객' },
  { href: '/designer/input' as Href, label: '입력' },
  { href: '/designer/revenue' as Href, label: '매출' },
  { href: '/profile' as Href, label: '마이' },
];

export function DesignerBottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = pathname === tab.href;

          return (
            <Link href={tab.href} key={String(tab.href)} asChild>
              <Pressable style={styles.tabItem}>
                <View style={[styles.tabDot, selected && styles.tabDotSelected]} />
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
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
    backgroundColor: '#FF5A5F',
  },
  tabLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelSelected: {
    color: '#FF5A5F',
  },
});
