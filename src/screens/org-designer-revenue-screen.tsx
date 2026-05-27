import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchDesignerRevenueAnalytics,
  type DesignerRevenueAnalytics,
} from '../../lib/designer-revenue-analytics';
import { resolveOrgDesignerAccess, type OrgScope } from '../../lib/org-access';
import { getCurrentUser } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { LoadingState } from '../components/loading-state';
import { EmptyState } from '../components/empty-state';

type Props = {
  scope: OrgScope;
};

export function OrgDesignerRevenueScreen({ scope }: Props) {
  const { designerId } = useLocalSearchParams<{ designerId: string }>();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [designerName, setDesignerName] = useState('');

  const load = useCallback(async () => {
    if (!designerId) {
      setErrorMessage('디자이너 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const user = await getCurrentUser();

      if (!user || user.role !== scope) {
        router.replace('/');
        return;
      }

      const access = resolveOrgDesignerAccess(user.role, designerId);

      if (!access) {
        setErrorMessage('조회 권한이 없습니다.');
        setAnalytics(null);
        return;
      }

      setDesignerName(access.designer.name);
      const data = await fetchDesignerRevenueAnalytics(undefined, undefined, designerId);
      setAnalytics(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '매출을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [designerId, scope]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selectedWeek = analytics?.selectedWeek;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ 매출 목록</Text>
        </Pressable>

        <Text style={styles.title}>{designerName || '디자이너'}</Text>
        <Text style={styles.subtitle}>디자이너 매출 탭과 동일한 주간·월간 데이터</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : analytics ? (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>이번 달 매출</Text>
                <Text style={styles.summaryValue}>
                  {analytics.selectedMonth.revenue.toLocaleString('ko-KR')}원
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>이번 달 시술</Text>
                <Text style={styles.summaryValue}>
                  {analytics.selectedMonthTreatmentCount.toLocaleString('ko-KR')}건
                </Text>
              </View>
            </View>

            {selectedWeek ? (
              <View style={styles.weekCard}>
                <Text style={styles.weekLabel}>{selectedWeek.label || '선택 주'}</Text>
                <Text style={styles.weekTotal}>
                  주간 매출 {selectedWeek.weekTotal.toLocaleString('ko-KR')}원 · 정산{' '}
                  {selectedWeek.settlementCount}건
                </Text>
                {selectedWeek.days.map((day) => (
                  <View key={day.date} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.weekdayLabel}</Text>
                    <Text style={styles.dayValue}>{day.totalAmount.toLocaleString('ko-KR')}원</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>최근 정산</Text>
            {analytics.recentSettlements.length === 0 ? (
              <Text style={styles.emptySettlements}>정산 내역이 없습니다.</Text>
            ) : (
              analytics.recentSettlements.slice(0, 8).map((item) => (
                <View key={item.paymentId} style={styles.settlementRow}>
                  <View style={styles.settlementMain}>
                    <Text style={styles.settlementTitle}>{item.customerName}</Text>
                    <Text style={styles.settlementMeta}>
                      {item.treatmentTitle} · {item.dateWithWeekdayLabel}
                    </Text>
                  </View>
                  <Text style={styles.settlementAmount}>{item.payout.toLocaleString('ko-KR')}원</Text>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 18,
  },
  backLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  summaryLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  emptySettlements: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  settlementRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  settlementMain: {
    flex: 1,
    gap: 4,
  },
  settlementTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  settlementMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  settlementAmount: {
    color: '#00C2A8',
    fontSize: 14,
    fontWeight: '900',
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  weekLabel: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  weekTotal: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  dayValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
});
