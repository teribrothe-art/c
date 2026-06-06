import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { appLayout } from '../../lib/theme';

type AppScreenShellProps = {
  children: ReactNode;
};

export function AppScreenShell({ children }: AppScreenShellProps) {
  if (Platform.OS !== 'web') {
    return <View style={styles.native}>{children}</View>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  native: {
    flex: 1,
  },
  webOuter: {
    alignItems: 'center',
    backgroundColor: '#D1D5DB',
    flex: 1,
    minHeight: '100%',
  },
  webInner: {
    backgroundColor: '#FAFAFC',
    flex: 1,
    maxWidth: appLayout.maxScreenWidth,
    width: '100%',
  },
});
