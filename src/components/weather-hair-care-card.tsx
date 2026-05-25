import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeatherHairCareAdvice } from '../../lib/weather-hair-care';

type WeatherHairCareCardProps = {
  advice: WeatherHairCareAdvice | null;
  isLoading?: boolean;
  onAiConsult?: () => void;
};

function riskColor(level: WeatherHairCareAdvice['riskLevel']) {
  if (level === 'high') {
    return '#FF5A5F';
  }

  if (level === 'medium') {
    return '#FFB627';
  }

  return '#00C2A8';
}

export function WeatherHairCareCard({ advice, isLoading, onAiConsult }: WeatherHairCareCardProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color="#7B5EE6" />
        <Text style={styles.loadingText}>오늘 날씨·모발 영향 분석 중…</Text>
      </View>
    );
  }

  if (!advice) {
    return null;
  }

  const accent = riskColor(advice.riskLevel);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#F5F3FF', '#FFFFFF']} style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.badge}>🌤️ 날씨·모발 AI</Text>
          <View style={[styles.riskDot, { backgroundColor: accent }]} />
        </View>

        <Text style={styles.weatherLine}>
          {advice.weather.cityLabel} · {advice.weather.conditionLabel} · {advice.weather.temperatureC}°C
          · 습도 {advice.weather.humidityPercent}%
        </Text>

        <Text style={styles.title}>{advice.headline}</Text>
        <Text style={styles.message}>{advice.message}</Text>

        {onAiConsult ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onAiConsult}
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}>
            <Text style={styles.linkText}>AI 상담에서 더 물어보기 →</Text>
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    width: '100%',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    paddingVertical: 24,
  },
  loadingText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderColor: 'rgba(123, 94, 230, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    color: '#7B5EE6',
    fontSize: 13,
    fontWeight: '800',
  },
  riskDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  weatherLine: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
  },
  message: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 4,
  },
  linkPressed: {
    opacity: 0.85,
  },
  linkText: {
    color: '#7B5EE6',
    fontSize: 14,
    fontWeight: '800',
  },
});
