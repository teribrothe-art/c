import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildCustomerAnalysis, CustomerAnalysis, DamageTrendItem } from '../lib/customer-analysis';
import { getTreatments } from '../lib/treatments';
import { BottomTabBar } from '../src/components/bottom-tab-bar';

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function TrendArrow({ change }: { change: DamageTrendItem['change'] }) {
  if (!change || change === 'same') {
    return <Text style={styles.trendSame}>→</Text>;
  }

  if (change === 'up') {
    return <Text style={styles.trendUp}>↑</Text>;
  }

  return <Text style={styles.trendDown}>↓</Text>;
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const [analysis, setAnalysis] = useState<CustomerAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnalysis = useCallback(() => {
    setIsLoading(true);

    getTreatments()
      .then(({ treatments }) => {
        setAnalysis(buildCustomerAnalysis(treatments));
        setErrorMessage('');
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '분석 데이터를 불러오지 못했습니다.';
        setErrorMessage(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalysis();
    }, [loadAnalysis]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>내 모발 분석</Text>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#FF5A5F" />
            <Text style={styles.stateText}>분석 데이터를 불러오는 중...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : !analysis?.hasData ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>아직 분석할 데이터가 없어요</Text>
            <Text style={styles.stateText}>시술 기록이 쌓이면 손상도와 AI 인사이트를 보여드릴게요.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 손상도 추세</Text>
              <Text style={styles.damageHeadline}>
                현재 손상도 {analysis.currentDamage ?? '-'}
                /10
              </Text>
              <View style={styles.trendRow}>
                {analysis.damageTrend.map((item, index) => (
                  <View key={`${item.treatmentTitle}-${index}`} style={styles.trendItemWrap}>
                    <View style={styles.trendBubble}>
                      <Text style={styles.trendLevel}>{item.damageLevel}</Text>
                      <Text style={styles.trendLabel} numberOfLines={1}>
                        {item.treatmentTitle}
                      </Text>
                    </View>
                    {index < analysis.damageTrend.length - 1 ? (
                      <TrendArrow change={analysis.damageTrend[index + 1].change} />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>시술 빈도</Text>
              <Text style={styles.frequencyLine}>최근 3개월 시술 {analysis.recentThreeMonthsCount}건</Text>
              <Text style={styles.frequencyHint}>다음 시술 권장: {analysis.nextRecommendation}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>AI 인사이트 모음</Text>
              {analysis.insights.length === 0 ? (
                <Text style={styles.emptyInsight}>저장된 AI 인사이트가 없습니다.</Text>
              ) : (
                analysis.insights.map((item, index) => (
                  <View key={`${item.date}-${item.title}`} style={[styles.insightItem, index === 0 && styles.insightItemFirst]}>
                    <Text style={styles.insightMeta}>
                      {formatDate(item.date)} · {item.title}
                    </Text>
                    <Text style={styles.insightText}>{item.insight}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    gap: 16,
    paddingHorizontal: 16,
  },
  pageTitle: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  damageHeadline: {
    color: '#FF5A5F',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
  },
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendItemWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  trendBubble: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  trendLevel: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  trendLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    maxWidth: 84,
    textAlign: 'center',
  },
  trendUp: {
    color: '#FF5A5F',
    fontSize: 22,
    fontWeight: '900',
  },
  trendDown: {
    color: '#00C2A8',
    fontSize: 22,
    fontWeight: '900',
  },
  trendSame: {
    color: '#6B6B7B',
    fontSize: 22,
    fontWeight: '900',
  },
  frequencyLine: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  frequencyHint: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  insightItem: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 12,
    marginTop: 12,
  },
  insightItemFirst: {
    borderTopWidth: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  emptyInsight: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  insightMeta: {
    color: '#7B5EE6',
    fontSize: 13,
    fontWeight: '700',
  },
  insightText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
