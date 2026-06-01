import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type RevenueSplitDraftActionsProps = {
  canRequest: boolean;
  canCancel: boolean;
  isSaving?: boolean;
  onRequest: () => void;
  onCancel: () => void;
};

export function RevenueSplitDraftActions({
  canRequest,
  canCancel,
  isSaving = false,
  onRequest,
  onCancel,
}: RevenueSplitDraftActionsProps) {
  const disabled = isSaving;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || !canCancel}
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelButton,
          (disabled || !canCancel) && styles.buttonDisabled,
          pressed && canCancel && !disabled && styles.pressed,
        ]}>
        <Text style={[styles.cancelButtonText, (disabled || !canCancel) && styles.cancelButtonTextDisabled]}>
          취소
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || !canRequest}
        onPress={onRequest}
        style={({ pressed }) => [
          styles.requestButton,
          (disabled || !canRequest) && styles.buttonDisabled,
          pressed && canRequest && !disabled && styles.pressed,
        ]}>
        <Text style={styles.requestButtonText}>승인 요청</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  requestButton: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cancelButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButtonTextDisabled: {
    color: '#9CA3AF',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.9,
  },
});
