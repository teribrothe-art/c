import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { LoginHeroAnimation } from './login-hero-animation';

const SALON_TITLE = '나만의 살롱';
const APP_TITLE = 'AI 헤어 다이어리';

const APP_INTRO_LINES = [
  '시술 기록을 한곳에 모아, 오래도록 이어가는 케어',
  '디자이너 진단 · 홈케어 가이드 · AI 맞춤 상담',
  '고객과 살롱이 함께 성장하는 헤어 다이어리',
] as const;

export function LoginHeadlines() {
  return (
    <View style={styles.block}>
      <Text style={styles.salon}>{SALON_TITLE}</Text>
      <Text style={styles.app}>{APP_TITLE}</Text>
      <LoginHeroAnimation />
      <View style={styles.introBlock}>
        <Text style={styles.introLabel}>앱 소개</Text>
        {APP_INTRO_LINES.map((line) => (
          <Text key={line} style={styles.introLine}>
            · {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    paddingHorizontal: 8,
    width: '100%',
  },
  salon: {
    color: colors.purple,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 52,
    textAlign: 'center',
  },
  app: {
    color: colors.coral,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  introBlock: {
    backgroundColor: '#FAFAFC',
    borderColor: '#EFEFF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  introLabel: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  introLine: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
});
