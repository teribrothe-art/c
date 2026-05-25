import { Href, Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs: { href: Href; label: string }[] = [
  { href: '/home', label: '다이어리' },
  { href: '/analysis', label: '분석' },
  { href: '/voice', label: 'AI 상담' },
  { href: '/profile', label: '마이' },
];

export function BottomTabBar() {
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
