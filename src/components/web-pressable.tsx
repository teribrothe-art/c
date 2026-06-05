import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  TouchableOpacity,
} from 'react-native';

type WebPressableProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
};

function resolveStyle(
  style: WebPressableProps['style'],
  pressed: boolean,
): StyleProp<ViewStyle> {
  if (typeof style === 'function') {
    return style({ pressed });
  }

  return style;
}

/** 웹에서 Pressable 클릭 누락 방지 — 웹은 TouchableOpacity 사용 */
export function WebPressable({
  children,
  disabled,
  onPress,
  style,
  ...rest
}: WebPressableProps) {
  if (Platform.OS === 'web') {
    const flatStyle = typeof style === 'function' ? style({ pressed: false }) : style;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        accessibilityLabel={rest.accessibilityLabel ?? undefined}
        accessibilityRole={rest.accessibilityRole}
        disabled={disabled ?? undefined}
        onPress={onPress ?? undefined}
        style={flatStyle}>
        {typeof children === 'function' ? children({ pressed: false }) : children}
      </TouchableOpacity>
    );
  }

  return (
    <Pressable disabled={disabled} onPress={onPress} style={style} {...rest}>
      {children}
    </Pressable>
  );
}

export function webPressableStyle(
  base: StyleProp<ViewStyle>,
  pressedStyle?: StyleProp<ViewStyle>,
): WebPressableProps['style'] {
  return ({ pressed }) => [base, pressed && pressedStyle];
}
