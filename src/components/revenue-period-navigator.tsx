import { Pressable, StyleSheet, Text, View } from 'react-native';

type RevenuePeriodNavigatorProps = {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canPrevious?: boolean;
  canNext?: boolean;
};

export function RevenuePeriodNavigator({
  label,
  onPrevious,
  onNext,
  canPrevious = true,
  canNext = true,
}: RevenuePeriodNavigatorProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="이전"
        disabled={!canPrevious}
        onPress={onPrevious}
        style={({ pressed }) => [
          styles.arrowButton,
          !canPrevious && styles.arrowButtonDisabled,
          pressed && canPrevious && styles.arrowButtonPressed,
        ]}>
        <Text style={[styles.arrowText, !canPrevious && styles.arrowTextDisabled]}>‹</Text>
      </Pressable>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <Pressable
        accessibilityLabel="다음"
        disabled={!canNext}
        onPress={onNext}
        style={({ pressed }) => [
          styles.arrowButton,
          !canNext && styles.arrowButtonDisabled,
          pressed && canNext && styles.arrowButtonPressed,
        ]}>
        <Text style={[styles.arrowText, !canNext && styles.arrowTextDisabled]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F8',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  arrowButtonDisabled: {
    opacity: 0.35,
  },
  arrowButtonPressed: {
    opacity: 0.85,
  },
  arrowText: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  arrowTextDisabled: {
    color: '#9CA3AF',
  },
  label: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
});
