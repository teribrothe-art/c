import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchDesignerRevenueAnalytics,
  type DesignerRevenueAnalytics,
} from '../../lib/designer-revenue-analytics';
import { resolveOrgDesignerAccess, type OrgScope } from '../../lib/org-access';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import { getCurrentUser } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { LoadingState } from '../components/loading-state';
import { EmptyState } from '../components/empty-state';
import {
  resolveDefaultWeekDay,
  SettlementWeekDayTabs,
  WeekdayRevenueTabs,
} from '../components/week-day-tabs';

type Props = {
  scope: OrgScope;
};

function countSettlementsByDate(
  settlements: DesignerRevenueAnalytics['recentSettlements'],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of settlements) {
    counts[item.date] = (counts[item.date] ?? 0) + 1;
  }

  return counts;
}

export function OrgDesignerRevenueScreen({ scope }: Props) {
  const { designerId } = useLocalSearchParams<{ designerId: string }>();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<DesignerRevenueAnalytics | null>(null);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | undefined>();
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [designerName, setDesignerName] = useState('');
  const [designerStoreLabel, setDesignerStoreLabel] = useState('');

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

      const storeOrgId = scope === 'store' ? await resolveCurrentStoreOrgId() : undefined;
      const access = resolveOrgDesignerAccess(user.role, designerId, storeOrgId);

      if (!access) {
        setErrorMessage('조회 권한이 없습니다.');
        setAnalytics(null);
        return;
      }

      setDesignerName(access.designer.name);
      setDesignerStoreLabel(`${access.designer.storeName} · ${access.designer.storeRegion}`);
      const data = await fetchDesignerRevenueAnalytics(undefined, undefined, designerId);
      setAnalytics(data);
      setSelectedWeekKey((prev) => {
        if (prev && data.weeklyWeeks.some((week) => week.weekKey === prev)) {
          return prev;
        }

        return data.selectedWeekKey;
      });
      const initialWeek =
        data.weeklyWeeks.find((week) => week.weekKey === data.selectedWeekKey) ?? data.selectedWeek;
      setSelectedDayDate(
        resolveDefaultWeekDay(initialWeek?.days ?? [], {
          settlementCountByDate: countSettlementsByDate(data.recentSettlements),
        }),
      );
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

  const selectedWeek = useMemo(() => {
    if (!analytics) {
      return null;
    }

    return (
      analytics.weeklyWeeks.find((week) => week.weekKey === selectedWeekKey) ?? analytics.selectedWeek
    );
  }, [analytics, selectedWeekKey]);

  const settlementCountByDate = useMemo(() => {
    if (!analytics) {
      return {};
    }

    return countSettlementsByDate(analytics.recentSettlements);
  }, [analytics]);

  const handleSelectWeek = useCallback(
    (weekKey: string) => {
      setSelectedWeekKey(weekKey);

      const week = analytics?.weeklyWeeks.find((item) => item.weekKey === weekKey);

      if (week) {
        setSelectedDayDate(
          resolveDefaultWeekDay(week.days, { settlementCountByDate }),
        );
      }
    },
    [analytics?.weeklyWeeks, settlementCountByDate],
  );

  const visibleSettlements = useMemo(() => {
    if (!analytics || !selectedDayDate) {
      return [];
    }

    return analytics.recentSettlements.filter((item) => item.date === selectedDayDate);
  }, [analytics, selectedDayDate]);

  const selectedDay = useMemo(
    () => selectedWeek?.days.find((day) => day.date === selectedDayDate) ?? null,
    [selectedDayDate, selectedWeek?.days],
  );

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
        {designerStoreLabel ? <Text style={styles.storeLine}>{designerStoreLabel}</Text> : null}
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

            {analytics.weeklyWeeks.length > 0 ? (
              <View style={styles.weekCard}>
                <Text style={styles.sectionLabel}>주간 매출 (월~일)</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.weekTabRow}>
                    {analytics.weeklyWeeks.map((week) => {
                      const selected = week.weekKey === selectedWeekKey;

                      return (
                        <Pressable
                          key={week.weekKey}
                          onPress={() => handleSelectWeek(week.weekKey)}
                          style={({ pressed }) => [
                            styles.weekTab,
                            selected && styles.weekTabSelected,
                            pressed && styles.weekTabPressed,
                          ]}>
                          <Text style={[styles.weekTabLabel, selected && styles.weekTabLabelSelected]}>
                            {week.label}
                          </Text>
                          <Text style={styles.weekTabAmount}>
                            {week.weekTotal.toLocaleString('ko-KR')}원
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {selectedWeek ? (
                  <>
                    <Text style={styles.weekTotal}>
                      주간 매출 {selectedWeek.weekTotal.toLocaleString('ko-KR')}원 · 정산{' '}
                      {selectedWeek.settlementCount}건
                    </Text>

                    <WeekdayRevenueTabs
                      days={selectedWeek.days}
                      onSelectDate={setSelectedDayDate}
                      selectedDate={selectedDayDate}
                    />

                    {selectedDay ? (
                      <View style={styles.selectedDaySummary}>
                        <Text style={styles.selectedDayLabel}>{selectedDay.weekdayDateLabel}</Text>
                        <Text style={styles.selectedDayAmount}>
                          {selectedDay.totalAmount.toLocaleString('ko-KR')}원
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={styles.settlementSection}>
              <Text style={styles.sectionTitle}>최근 정산</Text>

              {selectedWeek ? (
                <SettlementWeekDayTabs
                  days={selectedWeek.days}
                  onSelectDate={setSelectedDayDate}
                  selectedDate={selectedDayDate}
                  settlementCountByDate={settlementCountByDate}
                />
              ) : null}

              {visibleSettlements.length === 0 ? (
                <Text style={styles.emptySettlements}>
                  {selectedDayDate ? '해당 날짜에 정산 내역이 없습니다.' : '정산 내역이 없습니다.'}
                </Text>
              ) : (
                visibleSettlements.map((item) => (
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
            </View>
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
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  sectionLabel: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  weekTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  weekTab: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekTabSelected: {
    backgroundColor: '#F0EBFF',
    borderColor: '#7B5EE6',
  },
  weekTabPressed: {
    opacity: 0.9,
  },
  weekTabLabel: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  weekTabLabelSelected: {
    color: '#7B5EE6',
  },
  weekTabAmount: {
    color: '#FF5A5F',
    fontSize: 13,
    fontWeight: '900',
  },
  weekTotal: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedDaySummary: {
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderColor: '#C4B5FD',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedDayLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedDayAmount: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  settlementSection: {
    gap: 10,
  },
  emptySettlements: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  settlementRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  settlementAmount: {
    color: '#00C2A8',
    fontSize: 14,
    fontWeight: '900',
  },
});
