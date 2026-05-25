import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DailyCareSnapshot } from '../../lib/daily-care';
import { colors } from '../../lib/theme';

type TodayCareCardProps = {
  care: DailyCareSnapshot;
  onViewDiary: () => void;
};

export function TodayCareCard({ care, onViewDiary }: TodayCareCardProps) {
  const damageLabel =
    typeof care.damageLevel === 'number'
      ? `손상도 ${care.damageLevel}/10`
      : '손상도 기록 없음';

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={['#FFFFFF', '#F5F3FF']} style={styles.card}>
        <Text style={styles.title}>오늘의 케어</Text>

        <View style={styles.damageRow}>
          <Text style={styles.bulb}>💡</Text>
          <Text style={styles.damageText}>{damageLabel}</Text>
        </View>

        <Text style={styles.quote}>“{care.message}”</Text>

        <Pressable
          onPress={onViewDiary}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>다이어리 보기</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  card: {
    borderColor: '#E8E8F0',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  damageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  bulb: {
    fontSize: 18,
  },
  damageText: {
    color: colors.mint,
    fontSize: 16,
    fontWeight: '800',
  },
  quote: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 4,
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
