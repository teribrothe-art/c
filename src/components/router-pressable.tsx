import { useRouter, type Href } from 'expo-router';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type RouterPressableProps = Omit<PressableProps, 'onPress'> & {
  href: Href;
  onPress?: PressableProps['onPress'];
};

/** 웹·네이티브 공통 — Link+asChild 대신 router.push로 탭/링크 터치 보장 */
export function RouterPressable({
  href,
  onPress,
  style,
  children,
  ...rest
}: RouterPressableProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        onPress?.(event);
        router.push(href);
      }}
      style={(state) => {
        const resolved = typeof style === 'function' ? style(state) : style;
        return [webPressableStyle, resolved] as StyleProp<ViewStyle>;
      }}
      {...rest}>
      {children}
    </Pressable>
  );
}

const webPressableStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;
