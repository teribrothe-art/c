import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildDesignerRevenue, RevenueSummary } from '../../lib/designer-revenue';
import { getErrorMessage } from '../../lib/errors';
import { getDesignerTreatments } from '../../lib/treatments';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === 'danger' && styles.metricDanger,
          tone === 'success' && styles.metricSuccess,
        ]}>
        {value}
      </Text>
    </View>
  );
}

export default function DesignerRevenueScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRevenue = useCallback(() => {
    setIsLoading(true);

    getDesignerTreatments()
      .then(({ treatments }) => {
        setSummary(buildDesignerRevenue(treatments));
        setErrorMessage('');
      })
      .catch((error) => {
        const message = getErrorMessage(error, '매출 데이터를 불러오지 못했습니다.');
        setErrorMessage(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRevenue();
    }, [loadRevenue]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>매출 분석</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !summary ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage || '데이터를 불러올 수 없습니다.'}</Text>
          </View>
        ) : summary.monthTreatmentCount === 0 ? (
          <EmptyState
            icon="💰"
            subtitle="이번 달 시술이 등록되면 매출 분석이 표시됩니다"
            title="이번 달 시술 기록이 없어요"
          />
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>이번 달</Text>
              <Text style={styles.heroValue}>{summary.monthRevenue.toLocaleString('ko-KR')}</Text>
              <Text style={styles.heroUnit}>원</Text>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard label="시술 건수" value={`${summary.monthTreatmentCount}건`} />
              <MetricCard label="신규 고객" value={`${summary.newCustomerCount}명`} />
              <MetricCard
                label="정산 대기"
                tone="danger"
                value={`${summary.pendingSettlementCount}건`}
              />
              <MetricCard
                label="정산 완료"
                tone="success"
                value={`${summary.completedSettlementCount}건`}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 정산 내역</Text>
              {summary.recentSettlements.length === 0 ? (
                <Text style={styles.emptyText}>최근 정산 완료 내역이 없습니다.</Text>
              ) : (
                summary.recentSettlements.map((item) => (
                  <View key={item.id} style={styles.settlementRow}>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementCustomer}>{item.customerName}</Text>
                      <Text style={styles.settlementMeta}>
                        {item.treatmentTitle} · {formatDate(item.treatmentDate)}
                      </Text>
                    </View>
                    <Text style={styles.settlementPrice}>
                      {item.price.toLocaleString('ko-KR')}원
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <DesignerBottomTabBar />
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
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroValue: {
    color: '#1A1A2E',
    fontSize: 40,
    fontWeight: '900',
  },
  heroUnit: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 92,
    padding: 14,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    width: '48%',
  },
  metricLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  metricValue: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  metricDanger: {
    color: '#FF5A5F',
  },
  metricSuccess: {
    color: '#00C2A8',
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
  settlementRow: {
    alignItems: 'center',
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settlementInfo: {
    flex: 1,
    gap: 4,
  },
  settlementCustomer: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  settlementMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  settlementPrice: {
    color: '#00C2A8',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    textAlign: 'center',
  },
});
