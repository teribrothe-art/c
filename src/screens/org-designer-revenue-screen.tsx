import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  canGoToNextMonth,
  canGoToPreviousMonth,
  fetchDesignerRevenueAnalytics,
  shiftMonthKey,
  type DesignerRevenueAnalytics,
} from '../../lib/designer-revenue-analytics';
import { formatAmount } from '../../lib/currency-input';
import { resolveOrgDesignerAccess, type OrgScope } from '../../lib/org-access';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import { getCurrentUser } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { navigateBackOrOrgHome } from '../../lib/navigation';
import { LoadingState } from '../components/loading-state';
import { EmptyState } from '../components/empty-state';
import { OrgScopeTabBar, TAB_BAR_BOTTOM_INSET } from '../components/role-bottom-tab-bar';
import { RevenuePeriodNavigator } from '../components/revenue-period-navigator';

type Props = {
  scope: OrgScope;
};

function applySelectedWeek(
  analytics: DesignerRevenueAnalytics,
  weekKey: string,
): DesignerRevenueAnalytics {
  const selectedWeek = analytics.weeklyWeeks.find((week) => week.weekKey === weekKey);

  if (!selectedWeek) {
    return analytics;
  }

  return {
    ...analytics,
    selectedWeekKey: weekKey,
    selectedWeek,
  };
}

export function OrgDesignerRevenueScreen({ scope }: Props) {
  const { designerId } = useLocalSearchParams<{ designerId: string }>();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [designerName, setDesignerName] = useState('');
  const [designerStoreLabel, setDesignerStoreLabel] = useState('');

  const load = useCallback(
    async (monthKey?: string, weekKey?: string) => {
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

        const storeOrgId = scope === 'store' ? await resolveCurrentStoreOrgId() : undefined;
        const access = resolveOrgDesignerAccess(user.role, designerId, storeOrgId);

        if (!access) {
          setErrorMessage('조회 권한이 없습니다.');
          setAnalytics(null);
          return;
        }

        setDesignerName(access.designer.name);
        setDesignerStoreLabel(`${access.designer.storeName} · ${access.designer.storeRegion}`);
        const data = await fetchDesignerRevenueAnalytics(monthKey, weekKey, designerId);
        setAnalytics(data);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, '매출을 불러오지 못했습니다.'));
      } finally {
        setIsLoading(false);
      }
    },
    [designerId, scope],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selectedWeek = analytics?.selectedWeek;
  const monthSettlements = analytics?.selectedMonthSettlements ?? [];

  const handlePreviousMonth = useCallback(() => {
    if (!analytics || !canGoToPreviousMonth(analytics.selectedMonthKey)) {
      return;
    }

    void load(shiftMonthKey(analytics.selectedMonthKey, -1));
  }, [analytics, load]);

  const handleNextMonth = useCallback(() => {
    if (!analytics || !canGoToNextMonth(analytics.selectedMonthKey)) {
      return;
    }

    void load(shiftMonthKey(analytics.selectedMonthKey, 1));
  }, [analytics, load]);

  const weekIndex = useMemo(() => {
    if (!analytics) {
      return -1;
    }

    return analytics.weeklyWeeks.findIndex((week) => week.weekKey === analytics.selectedWeekKey);
  }, [analytics]);

  const handlePreviousWeek = useCallback(() => {
    if (!analytics || weekIndex <= 0) {
      return;
    }

    const previousWeek = analytics.weeklyWeeks[weekIndex - 1];
    setAnalytics(applySelectedWeek(analytics, previousWeek.weekKey));
  }, [analytics, weekIndex]);

  const handleNextWeek = useCallback(() => {
    if (!analytics || weekIndex < 0 || weekIndex >= analytics.weeklyWeeks.length - 1) {
      return;
    }

    const nextWeek = analytics.weeklyWeeks[weekIndex + 1];
    setAnalytics(applySelectedWeek(analytics, nextWeek.weekKey));
  }, [analytics, weekIndex]);

  const monthShortLabel = analytics?.selectedMonth.label.replace(/^\d{4}년\s/, '') ?? '';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_BOTTOM_INSET },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigateBackOrOrgHome(scope)} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ 매출 목록</Text>
        </Pressable>

        <Text style={styles.title}>{designerName || '디자이너'}</Text>
        {designerStoreLabel ? <Text style={styles.storeLine}>{designerStoreLabel}</Text> : null}
        <Text style={styles.subtitle}>월·주 이동으로 이전 기간 매출을 확인하세요</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : analytics ? (
          <>
            <View style={styles.monthNavCard}>
              <RevenuePeriodNavigator
                canNext={canGoToNextMonth(analytics.selectedMonthKey)}
                canPrevious={canGoToPreviousMonth(analytics.selectedMonthKey)}
                label={analytics.selectedMonth.label}
                onNext={handleNextMonth}
                onPrevious={handlePreviousMonth}
              />
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{monthShortLabel} 매출</Text>
                <Text style={styles.summaryValue}>
                  {formatAmount(analytics.selectedMonth.revenue)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{monthShortLabel} 시술</Text>
                <Text style={styles.summaryValue}>
                  {analytics.selectedMonthTreatmentCount.toLocaleString('ko-KR')}건
                </Text>
              </View>
            </View>

            {selectedWeek ? (
              <View style={styles.weekCard}>
                <RevenuePeriodNavigator
                  canNext={weekIndex >= 0 && weekIndex < analytics.weeklyWeeks.length - 1}
                  canPrevious={weekIndex > 0}
                  label={selectedWeek.label || '선택 주'}
                  onNext={handleNextWeek}
                  onPrevious={handlePreviousWeek}
                />
                <Text style={styles.weekTotal}>
                  주간 매출 {formatAmount(selectedWeek.weekTotal)} · 정산{' '}
                  {selectedWeek.settlementCount}건
                </Text>
                {selectedWeek.days.map((day) => {
                  const outOfMonth = !day.inSelectedMonth;

                  return (
                    <View
                      key={day.date}
                      style={[styles.dayRow, outOfMonth && styles.dayRowOutOfMonth]}>
                      <Text style={[styles.dayLabel, outOfMonth && styles.dayTextOutOfMonth]}>
                        {day.weekdayLabel}
                        {outOfMonth ? ' · 타월' : ''}
                      </Text>
                      <Text style={[styles.dayValue, outOfMonth && styles.dayTextOutOfMonth]}>
                        {formatAmount(day.totalAmount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>{monthShortLabel} 정산</Text>
            {monthSettlements.length === 0 ? (
              <Text style={styles.emptySettlements}>해당 월 정산 내역이 없습니다.</Text>
            ) : (
              monthSettlements.slice(0, 12).map((item) => (
                <View key={item.paymentId} style={styles.settlementRow}>
                  <View style={styles.settlementMain}>
                    <Text style={styles.settlementTitle}>{item.customerName}</Text>
                    <Text style={styles.settlementMeta}>
                      {item.treatmentTitle} · {item.dateWithWeekdayLabel}
                    </Text>
                  </View>
                  <Text style={styles.settlementAmount}>{formatAmount(item.payout)}</Text>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
      <OrgScopeTabBar scope={scope} />
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
  storeLine: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: -4,
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  monthNavCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
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
    gap: 10,
    padding: 14,
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
  dayRowOutOfMonth: {
    opacity: 0.42,
  },
  dayLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextOutOfMonth: {
    color: '#B8B8C8',
  },
  dayValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
});
