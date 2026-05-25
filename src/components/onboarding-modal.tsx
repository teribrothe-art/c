import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingSlide } from '../../lib/onboarding';
import { colors } from '../../lib/theme';

type OnboardingModalProps = {
  visible: boolean;
  slides: OnboardingSlide[];
  onComplete: () => void;
};

export function OnboardingModal({ visible, slides, onComplete }: OnboardingModalProps) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index >= slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      setIndex(0);
      onComplete();
      return;
    }

    setIndex((prev) => prev + 1);
  };

  if (!slide) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.welcome}>환영합니다!</Text>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{slide.icon}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>

          <View style={styles.dots}>
            {slides.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[styles.dot, dotIndex === index && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{isLast ? '시작하기' : '다음'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 12,
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
  },
  welcome: { color: colors.coral, fontSize: 14, fontWeight: '800' },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFEFF4',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginVertical: 8,
    width: 80,
  },
  icon: { fontSize: 40 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  description: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { backgroundColor: '#E0E0E8', borderRadius: 4, height: 8, width: 8 },
  dotActive: { backgroundColor: colors.coral, width: 20 },
  button: {
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 8,
    minWidth: '100%',
    paddingVertical: 14,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
