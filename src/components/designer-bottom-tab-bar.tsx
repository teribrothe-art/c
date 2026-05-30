import { Href, Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs: { href: Href; label: string; match?: (pathname: string) => boolean }[] = [
  {
    href: '/designer/home' as Href,
    label: '홈',
    match: (pathname) => pathname === '/designer/home',
  },
  {
    href: '/designer/clients' as Href,
    label: '고객',
    match: (pathname) =>
      pathname === '/designer/clients' || pathname.startsWith('/designer/clients/'),
  },
  {
    href: '/designer/input' as Href,
    label: '시술',
    match: (pathname) =>
      pathname === '/designer/input' ||
      pathname.startsWith('/designer/input/') ||
      pathname.startsWith('/designer/treatment/'),
  },
  {
    href: '/designer/revenue' as Href,
    label: '매출',
    match: (pathname) =>
      pathname === '/designer/revenue' || pathname.startsWith('/designer/revenue/'),
  },
  {
    href: '/profile' as Href,
    label: '계정',
    match: (pathname) =>
      pathname === '/profile' ||
      pathname.startsWith('/profile/') ||
      pathname === '/designer/my' ||
      pathname.startsWith('/designer/my/'),
  },
];

function isTabSelected(pathname: string, tab: (typeof tabs)[number]) {
  if (tab.match) {
    return tab.match(pathname);
  }

  const href = String(tab.href);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesignerBottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = isTabSelected(pathname, tab);

          return (
            <Link href={tab.href} key={String(tab.href)} asChild>
              <Pressable accessibilityRole="button" hitSlop={6} style={styles.tabItem}>
                <View style={[styles.tabDot, selected && styles.tabDotSelected]} />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
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
    left: 0,
    paddingHorizontal: 8,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 2,
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
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabLabelSelected: {
    color: '#FF5A5F',
  },
});
