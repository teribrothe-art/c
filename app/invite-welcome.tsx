import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../lib/theme';

export default function InviteWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { designerName, customerName } = useLocalSearchParams<{
    designerName?: string;
    customerName?: string;
  }>();

  const designer = designerName || '디자이너';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>디자이너 {designer}와 연결되었어요!</Text>
      <Text style={styles.subtitle}>
        {customerName ? `${customerName}님, ` : ''}이미 시술 기록이 있어요.{'\n'}다이어리에서 바로 확인해보세요.
      </Text>

      <Pressable
        onPress={() => router.replace('/today-care')}
        style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.88 }]}>
        <Text style={styles.primaryText}>다이어리 보기 →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    paddingHorizontal: 28,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 'auto',
    paddingVertical: 16,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
