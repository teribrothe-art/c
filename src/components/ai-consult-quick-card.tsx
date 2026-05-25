import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type AiConsultQuickCardProps = {
  onPress: () => void;
  subtitle?: string;
};

export function AiConsultQuickCard({
  onPress,
  subtitle = '시술 기록·손상도를 바탕으로 맞춤 상담',
}: AiConsultQuickCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient colors={['#E8FAF7', '#CCF2EC']} style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🎙️</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>AI 상담</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    alignItems: 'center',
    borderColor: 'rgba(0, 194, 168, 0.25)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  icon: {
    fontSize: 24,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  arrow: {
    color: colors.mint,
    fontSize: 28,
    fontWeight: '700',
  },
});
