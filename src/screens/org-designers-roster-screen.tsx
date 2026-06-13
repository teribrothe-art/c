import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '../../lib/currency-input';
import {
  fetchOrgDashboardSummary,
  formatOrgMonthCaption,
  formatOrgMonthShortLabel,
  groupOrgDesignersByStore,
  type OrgDashboardSummary,
  type OrgDesignerMetrics,
  type OrgDesignerStoreGroup,
} from '../../lib/org-aggregates';
import {
  canGoToNextMonth,
  canGoToPreviousMonth,
  getCurrentMonthKey,
  shiftMonthKey,
} from '../../lib/designer-revenue-month-nav';
import { formatHqYieldRatePercent } from '../../lib/org-month-settlement';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { RevenuePeriodNavigator } from '../components/revenue-period-navigator';
import {
  GlobalStoreMetricTabs,
  metricsFromStoreGroup,
  StoreMetricDetail,
  type StoreMetricTab,
} from '../components/store-metric-tabs';

function StoreGroupCard({
  group,
  tab,
  monthShortLabel,
  configuredHqRate,
  onPress,
}: {
  group: OrgDesignerStoreGroup;
  tab: StoreMetricTab;
  monthShortLabel: string;
  configuredHqRate?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.storeName} 디자이너 보기`}
      onPress={onPress}
      style={({ pressed }) => [styles.storeCard, pressed && styles.storeCardPressed]}>
      <Text style={styles.storeLabel}>소속 매장</Text>
      <Text style={styles.storeName}>{group.storeName}</Text>
      <Text style={styles.storeRegion}>{group.storeRegion}</Text>
      <StoreMetricDetail
        configuredHqRate={configuredHqRate}
        monthShortLabel={monthShortLabel}
        snapshot={metricsFromStoreGroup(group)}
        tab={tab}
      />
      <Text style={styles.storeTapHint}>탭하여 소속 디자이너 보기 →</Text>
    </Pressable>
  );
}

function DesignerRosterCard({
  designer,
  monthShortLabel,
}: {
  designer: OrgDesignerMetrics;
  monthShortLabel: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{designer.name}</Text>
        {designer.subtitle ? <Text style={styles.cardMeta}>{designer.subtitle}</Text> : null}
      </View>
      <Text style={styles.cardStats}>
        고객 {designer.customerCount}명 · 시술 {designer.treatmentCount}건 · {monthShortLabel}{' '}
        {designer.monthTreatmentCount}건
      </Text>
      <View style={styles.cardRevenueRow}>
        <View style={styles.cardRevenueCell}>
          <Text style={styles.cardRevenueLabel}>{monthShortLabel} 매출</Text>
          <Text style={styles.cardRevenueValue}>{formatAmount(designer.monthGrossSales)}</Text>
        </View>
        <View style={styles.cardRevenueCell}>
          <Text style={styles.cardRevenueLabel}>본사 수익률</Text>
          <Text style={styles.cardRevenuePercent}>
            {formatHqYieldRatePercent(designer.monthGrossSales, designer.monthHqRevenue)}
          </Text>
          <Text style={styles.cardRevenueSub}>{formatAmount(designer.monthHqRevenue)}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <Text style={styles.actionPrimary}>매출 보기</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/admin/customers',
              params: { designerId: designer.id },
            })
          }
          style={({ pressed }) => [styles.actionButtonOutline, pressed && styles.actionPressed]}>
          <Text style={styles.actionOutline}>고객·시술</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OrgDesignersRosterScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [globalMetricTab, setGlobalMetricTab] = useState<StoreMetricTab>('designers');
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const monthCaption = useMemo(() => formatOrgMonthCaption(selectedMonthKey), [selectedMonthKey]);
  const monthShortLabel = useMemo(
    () => formatOrgMonthShortLabel(selectedMonthKey),
    [selectedMonthKey],
  );

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary('admin', {
      monthKey: selectedMonthKey,
      withVirtualSimulation: false,
    })
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '디자이너 목록을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [selectedMonthKey]);

  const handlePreviousMonth = useCallback(() => {
    if (!canGoToPreviousMonth(selectedMonthKey)) {
      return;
    }

    setSelectedMonthKey(shiftMonthKey(selectedMonthKey, -1));
  }, [selectedMonthKey]);

  const handleNextMonth = useCallback(() => {
    if (!canGoToNextMonth(selectedMonthKey)) {
      return;
    }

    setSelectedMonthKey(shiftMonthKey(selectedMonthKey, 1));
  }, [selectedMonthKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const storeGroups = useMemo(
    () => (summary ? groupOrgDesignersByStore(summary.designers) : []),
    [summary],
  );

  const selectedGroup = useMemo(
    () => storeGroups.find((group) => group.storeId === selectedStoreId) ?? null,
    [selectedStoreId, storeGroups],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>매장</Text>
            <View style={styles.globalMetricsTabHost}>
              <GlobalStoreMetricTabs tab={globalMetricTab} onTabChange={setGlobalMetricTab} />
            </View>
            {selectedGroup ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="소속 매장 목록으로"
                onPress={() => setSelectedStoreId(null)}
                style={({ pressed }) => [
                  styles.headerBackEmoji,
                  pressed && styles.headerBackEmojiPressed,
                ]}>
                <Text style={styles.headerBackEmojiIcon}>↩️</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            {selectedGroup
              ? '소속 디자이너의 매출·고객·시술을 조회하세요.'
              : '상단 탭으로 전체 매장 지표를 함께 전환합니다.'}
          </Text>

          <View style={styles.monthNavCard}>
            <RevenuePeriodNavigator
              canNext={canGoToNextMonth(selectedMonthKey)}
              canPrevious={canGoToPreviousMonth(selectedMonthKey)}
              label={monthCaption}
              onNext={handleNextMonth}
              onPrevious={handlePreviousMonth}
            />
          </View>
        </View>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary && selectedGroup ? (
          <View style={styles.storeSection}>
            <View style={styles.storeHeader}>
              <Text style={styles.storeLabel}>소속 매장</Text>
              <Text style={styles.storeName}>{selectedGroup.storeName}</Text>
              <Text style={styles.storeRegion}>{selectedGroup.storeRegion}</Text>
              <StoreMetricDetail
                configuredHqRate={summary.configuredHqRate}
                monthShortLabel={monthShortLabel}
                snapshot={metricsFromStoreGroup(selectedGroup)}
                tab={globalMetricTab}
              />
            </View>
            <View style={styles.designerList}>
              {selectedGroup.designers.map((designer) => (
                <DesignerRosterCard
                  key={designer.id}
                  designer={designer}
                  monthShortLabel={monthShortLabel}
                />
              ))}
            </View>
          </View>
        ) : summary ? (
          <View style={styles.storeList}>
            {storeGroups.map((group) => (
              <StoreGroupCard
                key={group.storeId}
                configuredHqRate={summary.configuredHqRate}
                group={group}
                monthShortLabel={monthShortLabel}
                tab={globalMetricTab}
                onPress={() => setSelectedStoreId(group.storeId)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <AdminBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 18,
  },
  headerBlock: {
    gap: 6,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#1A1A2E',
    flexShrink: 0,
    fontSize: 24,
    fontWeight: '900',
  },
  globalMetricsTabHost: {
    flex: 1,
    minWidth: 0,
  },
  headerBackEmoji: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerBackEmojiPressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.92,
  },
  headerBackEmojiIcon: {
    fontSize: 16,
    lineHeight: 20,
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
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  storeCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '48%',
  },
  storeCardPressed: {
    backgroundColor: '#DFF2E0',
    opacity: 0.95,
  },
  storeTapHint: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  storeSection: {
    gap: 10,
  },
  storeHeader: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeLabel: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '800',
  },
  storeName: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: '900',
  },
  storeRegion: {
    color: '#388E3C',
    fontSize: 11,
    fontWeight: '600',
  },
  designerList: {
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardStats: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  cardRevenueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardRevenueCell: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardRevenueLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
  },
  cardRevenueValue: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  cardRevenuePercent: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '900',
  },
  cardRevenueSub: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  actionButtonOutline: {
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  actionPressed: {
    opacity: 0.9,
  },
  actionPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionOutline: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
