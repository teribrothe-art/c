import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import type { WeatherHairCareAdvice } from '../../lib/weather-hair-care';

type WeatherHairCareCardProps = {
  advice: WeatherHairCareAdvice | null;
  isLoading?: boolean;
  onAiConsult?: () => void;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function riskColor(level: WeatherHairCareAdvice['riskLevel']) {
  if (level === 'high') {
    return '#FF5A5F';
  }

  if (level === 'medium') {
    return '#FFB627';
  }

  return '#00C2A8';
}

function configureExpandAnimation() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function WeatherHairCareCard({ advice, isLoading, onAiConsult }: WeatherHairCareCardProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [advice?.headline, advice?.message, advice?.weather.temperatureC, advice?.weather.humidityPercent]);

  if (isLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color="#7B5EE6" />
        <Text style={styles.loadingText}>AI 스타일 팁 분석 중…</Text>
      </View>
    );
  }

  if (!advice) {
    return null;
  }

  const accent = riskColor(advice.riskLevel);
  const weatherSummary = `${advice.weather.cityLabel} · ${advice.weather.conditionLabel} · ${advice.weather.temperatureC}°C · 습도 ${advice.weather.humidityPercent}%`;

  const handleToggle = () => {
    configureExpandAnimation();
    setExpanded((current) => !current);
  };

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={[styles.card, !expanded && styles.cardCompact]}>
        <Pressable
          accessibilityHint={
            expanded
              ? '탭하면 AI 스타일 팁 상세 내용이 접힙니다'
              : '탭하면 AI 스타일 팁 상세 내용이 펼쳐집니다'
          }
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={handleToggle}
          style={({ pressed }) => [styles.headerPressable, pressed && styles.cardPressed]}>
          <View style={styles.headerRow}>
            <Text style={styles.badge}>✨ AI 스타일 팁</Text>
            <View style={styles.headerTrailing}>
              <View style={[styles.riskDot, { backgroundColor: accent }]} />
              <Text style={styles.expandHint}>{expanded ? '접기 ⌃' : '펼치기 ›'}</Text>
            </View>
          </View>

          <Text numberOfLines={expanded ? undefined : 1} style={styles.weatherLine}>
            {weatherSummary}
          </Text>

          <Text numberOfLines={expanded ? undefined : 1} style={expanded ? styles.title : styles.titleCompact}>
            {advice.headline}
          </Text>
        </Pressable>

        {expanded ? (
          <>
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
          </>
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
  cardCompact: {
    gap: 6,
    paddingVertical: 12,
  },
  cardPressed: {
    opacity: 0.92,
  },
  headerPressable: {
    gap: 6,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTrailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  expandHint: {
    color: '#9B8FD9',
    fontSize: 12,
    fontWeight: '700',
  },
  weatherLine: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  titleCompact: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
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
