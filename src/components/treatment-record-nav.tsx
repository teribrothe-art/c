import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, disabledButtonStyle } from '../../lib/theme';

type TreatmentRecordNavProps = {
  positionLabel: string;
  olderLabel?: string;
  newerLabel?: string;
  olderId: string | null;
  newerId: string | null;
  onNavigate: (treatmentId: string) => void;
};

export function TreatmentRecordNav({
  positionLabel,
  olderLabel = '이전 시술',
  newerLabel = '다음 시술',
  olderId,
  newerId,
  onNavigate,
}: TreatmentRecordNavProps) {
  if (!olderId && !newerId) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <Pressable
        disabled={!olderId}
        onPress={() => olderId && onNavigate(olderId)}
        style={({ pressed }) => [
          styles.button,
          !olderId && styles.buttonDisabled,
          pressed && olderId && styles.buttonPressed,
        ]}>
        <Text style={[styles.buttonText, !olderId && styles.buttonTextDisabled]}>‹ {olderLabel}</Text>
      </Pressable>

      <Text style={styles.position}>{positionLabel}</Text>

      <Pressable
        disabled={!newerId}
        onPress={() => newerId && onNavigate(newerId)}
        style={({ pressed }) => [
          styles.button,
          !newerId && styles.buttonDisabled,
          pressed && newerId && styles.buttonPressed,
        ]}>
        <Text style={[styles.buttonText, !newerId && styles.buttonTextDisabled]}>{newerLabel} ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  button: {
    borderRadius: 10,
    minWidth: 108,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  buttonDisabled: {
    ...disabledButtonStyle,
    backgroundColor: 'transparent',
    opacity: 1,
  },
  buttonPressed: {
    backgroundColor: '#F5F5F8',
  },
  buttonText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonTextDisabled: {
    color: colors.muted,
    fontWeight: '600',
  },
  position: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
