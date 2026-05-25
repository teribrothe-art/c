import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchDesignerRevenueAnalytics,
  type DesignerRevenueAnalytics,
} from '../../lib/designer-revenue-analytics';
import { getErrorMessage } from '../../lib/errors';
import { RevenueBarChart } from '../../src/components/revenue-bar-chart';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

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
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRevenue = useCallback(
    (monthKey?: string) => {
      setIsLoading(true);

      fetchDesignerRevenueAnalytics(monthKey)
        .then((data) => {
          setAnalytics(data);
          setSelectedMonthKey(data.selectedMonthKey);
          setErrorMessage('');
        })
        .catch((error) => {
          setErrorMessage(getErrorMessage(error, '매출 데이터를 불러오지 못했습니다.'));
        })
        .finally(() => setIsLoading(false));
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadRevenue(selectedMonthKey);
    }, [loadRevenue, selectedMonthKey]),
  );

  const monthlyChartPoints = useMemo(
    () =>
      [...(analytics?.months ?? [])]
        .filter((month) => month.revenue > 0)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .slice(-6)
        .map((month) => ({
          key: month.monthKey,
          label: month.label.replace(/^\d{4}년\s/, ''),
          value: month.revenue,
          subLabel: `${month.settlementCount}건`,
        })),
    [analytics?.months],
  );

  const dailyChartPoints = useMemo(
    () =>
      (analytics?.dailyTotals ?? []).map((day) => ({
        key: day.date,
        label: day.label,
        value: day.totalAmount,
        subLabel: `${day.settlementCount}건`,
      })),
    [analytics?.dailyTotals],
  );

  const hasAnyRevenue = Boolean(
    analytics &&
      (analytics.months.some((month) => month.revenue > 0) ||
        analytics.pendingPayoutCount > 0),
  );

  const handleSelectMonth = (monthKey: string) => {
    if (monthKey === selectedMonthKey) {
      return;
    }

    setSelectedMonthKey(monthKey);
    loadRevenue(monthKey);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>매출 분석</Text>
        <Text style={styles.pageSubtitle}>월별 매출과 선택한 달의 일별 합계를 확인하세요</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !analytics ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage || '데이터를 불러올 수 없습니다.'}</Text>
          </View>
        ) : !hasAnyRevenue ? (
          <EmptyState
            icon="📊"
            subtitle="정산 완료되면 월별·일별 매출이 표시됩니다"
            title="매출 데이터가 없어요"
          />
        ) : (
          <>
            <RevenueBarChart
              barColor={PURPLE}
              emptyMessage="월별 정산 매출이 없습니다"
              points={monthlyChartPoints}
              title="월별 매출 (정산 완료)"
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>월 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.monthChipRow}>
                  {analytics.months.map((month) => {
                    const selected = month.monthKey === analytics.selectedMonthKey;

                    return (
                      <Pressable
                        key={month.monthKey}
                        onPress={() => handleSelectMonth(month.monthKey)}
                        style={({ pressed }) => [
                          styles.monthChip,
                          selected && styles.monthChipSelected,
                          pressed && styles.monthChipPressed,
                        ]}>
                        <Text style={[styles.monthChipText, selected && styles.monthChipTextSelected]}>
                          {month.label}
                        </Text>
                        <Text
                          style={[
                            styles.monthChipAmount,
                            selected && styles.monthChipAmountSelected,
                          ]}>
                          {month.revenue.toLocaleString('ko-KR')}원
                        </Text>
                        <Text
                          style={[
                            styles.monthChipMeta,
                            selected && styles.monthChipMetaSelected,
                          ]}>
                          {month.settlementCount}건
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>{analytics.selectedMonth.label} 매출</Text>
              <Text style={styles.heroValue}>
                {analytics.selectedMonth.revenue.toLocaleString('ko-KR')}
              </Text>
              <Text style={styles.heroUnit}>원 · 정산 {analytics.selectedMonth.settlementCount}건</Text>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard
                label="월 평균 시술가"
                value={`${analytics.averageTreatmentPrice.toLocaleString('ko-KR')}원`}
              />
              <MetricCard
                label="정산 대기"
                tone="danger"
                value={`${analytics.pendingPayoutAmount.toLocaleString('ko-KR')}원`}
              />
              <MetricCard label="대기 건수" tone="danger" value={`${analytics.pendingPayoutCount}건`} />
              <MetricCard
                label="일별 정산일"
                tone="success"
                value={`${analytics.dailyTotals.length}일`}
              />
            </View>

            <RevenueBarChart
              emptyMessage={`${analytics.selectedMonth.label} 일별 정산 내역이 없습니다`}
              points={dailyChartPoints}
              title={`${analytics.selectedMonth.label} 일별 합계`}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>일별 합계 금액</Text>
              {analytics.dailyTotals.length === 0 ? (
                <Text style={styles.emptyText}>이 달에 정산된 일별 내역이 없습니다.</Text>
              ) : (
                analytics.dailyTotals.map((day) => (
                  <View key={day.date} style={styles.dailyRow}>
                    <View style={styles.dailyInfo}>
                      <Text style={styles.dailyDate}>{formatDate(day.date)}</Text>
                      <Text style={styles.dailyMeta}>정산 {day.settlementCount}건</Text>
                    </View>
                    <Text style={styles.dailyAmount}>{day.totalAmount.toLocaleString('ko-KR')}원</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{analytics.selectedMonth.label} 정산 상세</Text>
              {analytics.recentSettlements.length === 0 ? (
                <Text style={styles.emptyText}>해당 월 정산 완료 내역이 없습니다.</Text>
              ) : (
                analytics.recentSettlements.map((item) => (
                  <View key={item.paymentId} style={styles.settlementRow}>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementDate}>{formatDate(item.date)}</Text>
                      <Text style={styles.settlementCustomer}>{item.customerName}</Text>
                      <Text style={styles.settlementMeta}>{item.treatmentTitle}</Text>
                    </View>
                    <Text style={styles.settlementPrice}>{item.payout.toLocaleString('ko-KR')}원</Text>
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
  pageTitle: { color: '#1A1A2E', fontSize: 24, fontWeight: '900' },
  pageSubtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: -8,
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
  monthChipRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  monthChip: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  monthChipSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: PURPLE,
  },
  monthChipPressed: { opacity: 0.9 },
  monthChipText: { color: '#1A1A2E', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  monthChipTextSelected: { color: PURPLE },
  monthChipAmount: { color: CORAL, fontSize: 16, fontWeight: '900' },
  monthChipAmountSelected: { color: CORAL },
  monthChipMeta: { color: '#6B6B7B', fontSize: 12, fontWeight: '600', marginTop: 2 },
  monthChipMetaSelected: { color: '#6B6B7B' },
  dailyRow: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dailyInfo: { flex: 1, gap: 2 },
  dailyDate: { color: '#1A1A2E', fontSize: 15, fontWeight: '800' },
  dailyMeta: { color: '#6B6B7B', fontSize: 12, fontWeight: '600' },
  dailyAmount: { color: MINT, fontSize: 16, fontWeight: '900' },
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
