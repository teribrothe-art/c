import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type EmptyStateProps = {
  icon?: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = '📖',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  let action: ReactNode = null;

  if (actionLabel && onAction) {
    action = (
      <Pressable onPress={onAction} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  illustration: {
    alignItems: 'center',
    backgroundColor: '#EFEFF4',
    borderRadius: 20,
    height: 100,
    justifyContent: 'center',
    marginBottom: 8,
    width: 100,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.coral,
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
