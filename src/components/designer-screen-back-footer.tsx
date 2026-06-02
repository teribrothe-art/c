import { type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { navigateBackOrReplace } from '../../lib/navigation';

/** 디자이너 탭 화면 하단 탭 바 바로 위 뒤로가기 */
export function DesignerScreenBackFooter({
  fallback = '/designer/home' as Href,
}: {
  fallback?: Href;
}) {
  const insets = useSafeAreaInsets();
  const tabBarOffset = Math.max(insets.bottom, 12) + 56;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: tabBarOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        onPress={() => navigateBackOrReplace(fallback)}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <Text style={styles.chevron}>‹</Text>
        <Text style={styles.label}>뒤로가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 9,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    minHeight: 40,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonPressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.92,
  },
  chevron: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  label: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
});
