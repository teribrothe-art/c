import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type LoadingStateProps = {
  message?: string;
  minHeight?: number;
};

export function LoadingState({ message = '불러오는 중...', minHeight = 220 }: LoadingStateProps) {
  return (
    <View style={[styles.container, { minHeight }]}>
      <ActivityIndicator color={colors.coral} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
