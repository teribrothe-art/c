import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../src/components/bottom-tab-bar';

export default function AiConsultScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 32, paddingBottom: 120 }]}>
        <Text style={styles.preparingText}>준비 중</Text>

        <Pressable disabled style={styles.micButtonWrap}>
          <LinearGradient colors={['#FF5A5F', '#7B5EE6']} style={styles.micButton}>
            <Text style={styles.micIcon}>🎤</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.subtitle}>곧 만나뵐 AI 음성 상담 기능</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            AI가 당신의 시술 이력을 분석해서 맞춤 조언을 드릴 거예요
          </Text>
          <Text style={styles.infoDate}>출시 예정: 2026 7월</Text>
        </View>
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  preparingText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  micButtonWrap: {
    marginBottom: 20,
  },
  micButton: {
    alignItems: 'center',
    borderRadius: 70,
    height: 140,
    justifyContent: 'center',
    width: 140,
  },
  micIcon: {
    fontSize: 52,
  },
  subtitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 28,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#EFEFF4',
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  infoText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  infoDate: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
