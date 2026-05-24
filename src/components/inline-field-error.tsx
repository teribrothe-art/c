import { StyleSheet, Text } from 'react-native';

import { colors } from '../../lib/theme';

export function InlineFieldError({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
