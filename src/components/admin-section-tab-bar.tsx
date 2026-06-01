import { Href, Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type AdminSectionTab = {
  href: Href;
  label: string;
  meta: string;
  matchPrefixes?: string[];
};

const ADMIN_SECTION_TABS: AdminSectionTab[] = [
  {
    href: '/admin/reservations' as Href,
    label: '예약',
    meta: '가입 고객 시술·예약 현황',
    matchPrefixes: ['/admin/reservations'],
  },
  {
    href: '/admin/designers' as Href,
    label: '매장',
    meta: '소속·누적 테스트 포함',
    matchPrefixes: ['/admin/designers', '/admin/designer', '/admin/customers'],
  },
  {
    href: '/admin/revenue' as Href,
    label: '매출',
    meta: '전체 매출·정산',
    matchPrefixes: ['/admin/revenue'],
  },
  {
    href: '/admin/revenue-split' as Href,
    label: '수수료',
    meta: '구조·상호 승인',
    matchPrefixes: ['/admin/revenue-split'],
  },
];

function isTabSelected(pathname: string, tab: AdminSectionTab) {
  const href = String(tab.href);

  if (pathname === href) {
    return true;
  }

  return (tab.matchPrefixes ?? [href]).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AdminSectionTabBar() {
  const pathname = usePathname();

  return (
    <View style={styles.row}>
      {ADMIN_SECTION_TABS.map((tab) => {
        const href = String(tab.href);
        const selected = isTabSelected(pathname, tab);

        return (
          <Link href={tab.href} key={href} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
              <Text style={styles.tabMeta} numberOfLines={2}>
                {tab.meta}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabSelected: {
    backgroundColor: '#F7F4FF',
    borderColor: colors.purple,
  },
  tabPressed: {
    opacity: 0.92,
  },
  tabLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  tabLabelSelected: {
    color: colors.purple,
  },
  tabMeta: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
});
