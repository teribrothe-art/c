import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchOrgDashboardSummary,
  groupOrgDesignersByStore,
  type OrgDashboardSummary,
  type OrgDesignerMetrics,
  type OrgDesignerStoreGroup,
} from '../../lib/org-aggregates';
import { formatAmount } from '../../lib/currency-input';
import { formatDesignerNamePreview } from '../../lib/designer-name-preview';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';

type StoreMetricTab = 'designers' | 'customers' | 'treatments' | 'sales' | 'hq';

const STORE_METRIC_TABS: { key: StoreMetricTab; label: string }[] = [
  { key: 'designers', label: '디자이너' },
  { key: 'customers', label: '고객' },
  { key: 'treatments', label: '시술' },
  { key: 'sales', label: '매출' },
  { key: 'hq', label: '본사' },
];

function getStoreMetricDetail(group: OrgDesignerStoreGroup, tab: StoreMetricTab) {
  switch (tab) {
    case 'designers':
      return {
        value: `${group.designers.length}명`,
        meta: formatDesignerNamePreview(group.designers.map((designer) => designer.name)),
      };
    case 'customers':
      return {
        value: `${group.customerCount}명`,
        meta: '소속 디자이너 연결 고객 합계',
      };
    case 'treatments':
      return {
        value: `${group.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        meta: '이번 달 시술 건수',
      };
    case 'sales':
      return {
        value: formatAmount(group.monthGrossSales),
        meta: '이번 달 매출',
      };
    case 'hq':
      return {
        value: formatAmount(group.monthHqRevenue),
        meta: '이번 달 본사 수익',
      };
  }
}

function GlobalStoreMetricTabs({
  tab,
  onTabChange,
}: {
  tab: StoreMetricTab;
  onTabChange: (next: StoreMetricTab) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.globalMetricsTabScroll}>
      <View style={styles.globalMetricsTabRow}>
        {STORE_METRIC_TABS.map(({ key, label }) => {
          const active = tab === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onTabChange(key)}
              style={({ pressed }) => [
                styles.globalMetricsTab,
                active && styles.globalMetricsTabActive,
                pressed && styles.globalMetricsTabPressed,
              ]}>
              <Text style={[styles.globalMetricsTabLabel, active && styles.globalMetricsTabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StoreGroupMetricsDetail({
  group,
  tab,
}: {
  group: OrgDesignerStoreGroup;
  tab: StoreMetricTab;
}) {
  const detail = getStoreMetricDetail(group, tab);

  return (
    <View style={styles.metricsDetail}>
      <Text style={styles.metricsValue}>{detail.value}</Text>
      <Text style={styles.metricsMeta}>{detail.meta}</Text>
    </View>
  );
}

function StoreGroupCard({
  group,
  tab,
  onPress,
}: {
  group: OrgDesignerStoreGroup;
  tab: StoreMetricTab;
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
      <StoreGroupMetricsDetail group={group} tab={tab} />
      <Text style={styles.storeTapHint}>탭하여 소속 디자이너 보기 →</Text>
    </Pressable>
  );
}

function DesignerRosterCard({ designer }: { designer: OrgDesignerMetrics }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{designer.name}</Text>
        {designer.subtitle ? <Text style={styles.cardMeta}>{designer.subtitle}</Text> : null}
      </View>
      <Text style={styles.cardStats}>
        고객 {designer.customerCount}명 · 시술 {designer.treatmentCount}건 · 이번 달{' '}
        {designer.monthTreatmentCount}건
      </Text>
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary('admin')
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '디자이너 목록을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

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
            <Text style={styles.title}>디자이너</Text>
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
              <StoreGroupMetricsDetail group={selectedGroup} tab={globalMetricTab} />
            </View>
            <View style={styles.designerList}>
              {selectedGroup.designers.map((designer) => (
                <DesignerRosterCard key={designer.id} designer={designer} />
              ))}
            </View>
          </View>
        ) : summary ? (
          <View style={styles.storeList}>
            {storeGroups.map((group) => (
              <StoreGroupCard
                key={group.storeId}
                group={group}
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
  globalMetricsTabScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  globalMetricsTabRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
  },
  globalMetricsTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  globalMetricsTabActive: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  globalMetricsTabPressed: {
    opacity: 0.92,
  },
  globalMetricsTabLabel: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '700',
  },
  globalMetricsTabLabelActive: {
    color: colors.purple,
    fontWeight: '900',
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
  storeList: {
    gap: 12,
  },
  storeCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  storeCardPressed: {
    backgroundColor: '#DFF2E0',
    opacity: 0.95,
  },
  storeTapHint: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
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
    fontSize: 18,
    fontWeight: '900',
  },
  storeRegion: {
    color: '#388E3C',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsDetail: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C8E6C9',
    borderRadius: 10,
    gap: 2,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricsValue: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: '900',
  },
  metricsMeta: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
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
