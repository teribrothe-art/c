import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import {
  buildVirtualStoreSummaries,
  getSimulationTimeline,
  getVirtualStoreForScope,
  VIRTUAL_SIMULATION_SCENARIOS,
  type VirtualSimulationScenario,
  type VirtualStoreSummary,
} from '../../lib/org-virtual-simulation';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { VirtualSimulationBanner } from '../components/virtual-simulation-banner';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';
import { LoadingState } from '../components/loading-state';

type Props = {
  scope: OrgScope;
};

export function OrgSimulationScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [scenario, setScenario] = useState<VirtualSimulationScenario>('weekday');
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [stores, setStores] = useState<VirtualStoreSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary(scope, { scenario, withVirtualSimulation: true })
      .then((simulated) => {
        setSummary(simulated);
        setStores(scope === 'admin' ? buildVirtualStoreSummaries(simulated) : []);
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

  const timeline = getSimulationTimeline(scenario);
  const storeEntity = getVirtualStoreForScope(scope);
  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>가상 시뮬레이션</Text>
        <Text style={styles.pageSubtitle}>
          매장·디자이너·고객 데이터를 합성해 운영 시나리오를 미리 봅니다.
        </Text>

        <VirtualSimulationBanner scenario={scenario} />

        <Text style={styles.sectionLabel}>시나리오</Text>
        <View style={styles.scenarioRow}>
          {VIRTUAL_SIMULATION_SCENARIOS.map((item) => {
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
                <Text style={styles.storeRegion}>{storeEntity.region} · 가상 매장</Text>
                <Text style={styles.storeStats}>
                  이번 달 매출 {summary.monthRevenue.toLocaleString('ko-KR')}원 · 시술{' '}
                  {summary.monthTreatmentCount}건
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
                <Text style={styles.sectionLabel}>가상 매장 네트워크</Text>
                {stores.map((store) => (
                  <View key={store.id} style={styles.storeCard}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeRegion}>
                      {store.region} · 디자이너 {store.designerCount}명
                    </Text>
                    <Text style={styles.storeStats}>
                      매출 {store.monthRevenue.toLocaleString('ko-KR')}원 · 고객{' '}
                      {store.customerCount}명 · 정산대기{' '}
                      {store.pendingPayoutAmount.toLocaleString('ko-KR')}원
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={styles.sectionLabel}>디자이너 합성 지표</Text>
            {summary.designers.map((designer) => (
              <View key={designer.id} style={styles.designerRow}>
                <Text style={styles.designerName}>{designer.name}</Text>
                <Text style={styles.designerMeta}>
                  시술 {designer.monthTreatmentCount}건 · 매출{' '}
                  {designer.monthRevenue.toLocaleString('ko-KR')}원
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
  pageTitle: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
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
