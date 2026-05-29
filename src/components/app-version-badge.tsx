import { StyleSheet, Text, View } from 'react-native';

import { formatAppVersionLine } from '../../lib/app-version';

type AppVersionBadgeProps = {
  /** 로그인 화면 하단 고정 */
  pinned?: boolean;
};

export function AppVersionBadge({ pinned = false }: AppVersionBadgeProps) {
  return (
    <View style={[styles.wrap, pinned && styles.pinned]}>
      <Text style={styles.text}>{formatAppVersionLine()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  pinned: {
    marginTop: 28,
    opacity: 0.92,
  },
  text: {
    color: '#9A9AAA',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
