import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { IronlongLogoMark } from './ironlong-logo';

type AppBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** 아이롱 로고 마크 뒤로가기 */
export function AppBackButton({
  onPress,
  accessibilityLabel = '뒤로가기',
  label,
  size = 36,
  style,
}: AppBackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, style]}>
      <IronlongLogoMark size={size} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  label: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
});
