import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchDesignerPaymentDashboard } from '../../lib/designer-payment-stats';
import { getErrorMessage } from '../../lib/errors';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';

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
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchDesignerPaymentDashboard>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRevenue = useCallback(() => {
    setIsLoading(true);

    fetchDesignerPaymentDashboard()
      .then((data) => {
        setDashboard(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '매출 데이터를 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRevenue();
    }, [loadRevenue]),
  );

  const hasData = dashboard && (dashboard.monthSettlementCount > 0 || dashboard.pendingPayoutCount > 0);

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
        ) : errorMessage || !dashboard ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage || '데이터를 불러올 수 없습니다.'}</Text>
          </View>
        ) : !hasData ? (
          <EmptyState
            icon="📊"
            subtitle="정산 완료되면 매출이 표시됩니다"
            title="이번 달 매출이 없어요"
          />
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>이번 달 총 매출</Text>
              <Text style={styles.heroValue}>{dashboard.monthRevenue.toLocaleString('ko-KR')}</Text>
              <Text style={styles.heroUnit}>원 (정산 완료 기준)</Text>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard label="이번 달 정산" value={`${dashboard.monthSettlementCount}건`} tone="success" />
              <MetricCard
                label="평균 시술가"
                value={`${dashboard.averageTreatmentPrice.toLocaleString('ko-KR')}원`}
              />
              <MetricCard
                label="정산 대기"
                tone="danger"
                value={`${dashboard.pendingPayoutAmount.toLocaleString('ko-KR')}원`}
              />
              <MetricCard label="대기 건수" tone="danger" value={`${dashboard.pendingPayoutCount}건`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 정산 내역</Text>
              {dashboard.recentSettlements.length === 0 ? (
                <Text style={styles.emptyText}>최근 정산 완료 내역이 없습니다.</Text>
              ) : (
                dashboard.recentSettlements.map((item) => (
                  <View key={item.paymentId} style={styles.settlementRow}>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementDate}>{formatDate(item.date)}</Text>
                      <Text style={styles.settlementCustomer}>{item.customerName}</Text>
                      <Text style={styles.settlementMeta}>{item.treatmentTitle}</Text>
                      {item.feeAmount > 0 ? (
                        <Text style={styles.feeText}>
                          수수료 -{item.feeAmount.toLocaleString('ko-KR')}원
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.settlementPrice}>
                      {item.payout.toLocaleString('ko-KR')}원
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
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  content: { gap: 16, paddingHorizontal: 16 },
  pageTitle: { color: '#1A1A2E', fontSize: 24, fontWeight: '900', marginBottom: 4 },
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
  heroLabel: { color: '#6B6B7B', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  heroValue: { color: '#1A1A2E', fontSize: 40, fontWeight: '900' },
  heroUnit: { color: '#6B6B7B', fontSize: 14, fontWeight: '600', marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 92,
    padding: 14,
    width: '48%',
    elevation: 3,
  },
  metricLabel: { color: '#6B6B7B', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  metricValue: { color: '#1A1A2E', fontSize: 20, fontWeight: '900' },
  metricDanger: { color: CORAL },
  metricSuccess: { color: MINT },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  cardTitle: { color: '#1A1A2E', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  settlementRow: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settlementInfo: { flex: 1, gap: 2 },
  settlementDate: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  settlementCustomer: { color: '#1A1A2E', fontSize: 15, fontWeight: '800' },
  settlementMeta: { color: '#6B6B7B', fontSize: 13, fontWeight: '600' },
  feeText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginTop: 2 },
  settlementPrice: { color: CORAL, fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#6B6B7B', fontSize: 14, fontWeight: '600' },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  stateText: { color: '#6B6B7B', fontSize: 14, textAlign: 'center' },
});
