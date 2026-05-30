import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { formatAmount } from '../../lib/currency-input';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import {
  buildVirtualStoreSummaries,
  getSimulationTimeline,
  getVirtualStoreForScope,
  VIRTUAL_SIMULATION_SCENARIOS,
  type VirtualSimulationScenario,
  type VirtualStore,
  type VirtualStoreSummary,
} from '../../lib/org-virtual-simulation';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { VirtualSimulationBanner } from '../components/virtual-simulation-banner';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';
import { LoadingState } from '../components/loading-state';
import {
  GlobalStoreMetricTabs,
  StoreMetricDetail,
  type StoreMetricSnapshot,
  type StoreMetricTab,
} from '../components/store-metric-tabs';

type Props = {
  scope: OrgScope;
};

function metricsFromVirtualStore(
  store: VirtualStoreSummary,
  designerNames: string[],
): StoreMetricSnapshot {
  return {
    designerCount: store.designerCount,
    designerNames,
    customerCount: store.customerCount,
    monthTreatmentCount: store.monthTreatmentCount,
    monthGrossSales: store.monthGrossSales,
    monthHqRevenue: store.monthHqRevenue,
  };
}

export function OrgSimulationScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [scenario, setScenario] = useState<VirtualSimulationScenario>('weekday');
  const [globalMetricTab, setGlobalMetricTab] = useState<StoreMetricTab>('designers');
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [stores, setStores] = useState<VirtualStoreSummary[]>([]);
  const [storeEntity, setStoreEntity] = useState<VirtualStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);

    const storeOrgPromise = scope === 'store' ? resolveCurrentStoreOrgId() : Promise.resolve(undefined);

    storeOrgPromise
      .then((storeOrgId) =>
        fetchOrgDashboardSummary(scope, {
          scenario,
          withVirtualSimulation: true,
          storeOrgId,
        }).then((simulated) => ({ simulated, storeOrgId })),
      )
      .then(({ simulated, storeOrgId }) => {
        setSummary(simulated);
        setStores(scope === 'admin' ? buildVirtualStoreSummaries(simulated) : []);
        setStoreEntity(scope === 'store' ? getVirtualStoreForScope('store', storeOrgId) : null);
      })
      .catch(() => {
        setSummary(null);
        setStores([]);
      })
      .finally(() => setIsLoading(false));
  }, [scenario, scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const timeline = getSimulationTimeline(scenario, summary?.monthTreatmentCount ?? 0);
  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;

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
            <Text style={styles.pageTitle}>가상</Text>
            {scope === 'admin' ? (
              <View style={styles.globalMetricsTabHost}>
                <GlobalStoreMetricTabs tab={globalMetricTab} onTabChange={setGlobalMetricTab} />
              </View>
            ) : null}
          </View>
          <Text style={styles.pageSubtitle}>
            등록된 디자이너·시술·시술 금액을 불러온 뒤, 평일·주말·월말 시나리오 배율로 운영 지표를
            조정해 봅니다.
            {scope === 'admin' ? ' 상단 탭으로 지역별 플랜비 지표를 함께 전환합니다.' : ''}
          </Text>
        </View>

        <VirtualSimulationBanner scenario={scenario} onScenarioChange={setScenario} />

        <Text style={styles.sectionLabel}>추가 시나리오</Text>
        <View style={styles.scenarioRow}>
          {VIRTUAL_SIMULATION_SCENARIOS.filter((item) => item.key === 'month_end').map((item) => {
            const selected = scenario === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setScenario(item.key)}
                style={[styles.scenarioChip, selected && styles.scenarioChipSelected]}>
                <Text style={[styles.scenarioChipText, selected && styles.scenarioChipTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <LoadingState message="시뮬레이션 계산 중..." />
        ) : summary ? (
          <>
            {scope === 'store' && storeEntity ? (
              <View style={styles.storeCard}>
                <Text style={styles.storeName}>{storeEntity.name}</Text>
                <Text style={styles.storeRegion}>
                  {storeEntity.region} · {storeEntity.hotPlace}
                </Text>
                <Text style={styles.storeStats}>
                  이번 달 매출 {formatAmount(summary.monthGrossSales)} · 본사{' '}
                  {formatAmount(summary.monthHqRevenue)} · 시술 {summary.monthTreatmentCount}건
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>오늘 타임라인 (가상)</Text>
            {timeline.map((slot) => (
              <View key={slot.hour} style={styles.timelineRow}>
                <Text style={styles.timelineHour}>{slot.hour}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineLabel}>{slot.label}</Text>
                  <Text style={styles.timelineValue}>예상 시술 {slot.value}건</Text>
                </View>
              </View>
            ))}

            {scope === 'admin' ? (
              <>
                <Text style={styles.sectionLabel}>지역별 플랜비</Text>
                {stores.map((store) => {
                  const storeDesigners = summary.designers.filter(
                    (designer) => designer.storeId === store.id,
                  );

                  return (
                    <View key={store.id} style={styles.storeCard}>
                      <Text style={styles.storeName}>{store.name}</Text>
                      <Text style={styles.storeRegion}>{store.hotPlace}</Text>
                      <StoreMetricDetail
                        snapshot={metricsFromVirtualStore(
                          store,
                          storeDesigners.map((designer) => designer.name),
                        )}
                        tab={globalMetricTab}
                        variant="neutral"
                      />
                    </View>
                  );
                })}
              </>
            ) : null}

            <Text style={styles.sectionLabel}>디자이너 지표 (실데이터 + 시나리오)</Text>
            {summary.designers.map((designer) => (
              <View key={designer.id} style={styles.designerRow}>
                <Text style={styles.designerName}>{designer.name}</Text>
                <Text style={styles.designerMeta}>
                  {designer.storeName} · 시술 {designer.monthTreatmentCount}건 · 매출{' '}
                  {formatAmount(designer.monthGrossSales)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.errorText}>{getErrorMessage(null, '시뮬레이션을 불러오지 못했습니다.')}</Text>
        )}
      </ScrollView>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 12,
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
  pageTitle: {
    color: '#1A1A2E',
    flexShrink: 0,
    fontSize: 24,
    fontWeight: '900',
  },
  globalMetricsTabHost: {
    flex: 1,
    minWidth: 0,
  },
  pageSubtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  scenarioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scenarioChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scenarioChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  scenarioChipText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  scenarioChipTextSelected: {
    color: colors.purple,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  storeName: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  storeRegion: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  storeStats: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  timelineHour: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '900',
    width: 48,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  timelineValue: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  designerRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  designerName: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  designerMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
