import { useMemo, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { OrgDesignerMetrics } from '../../lib/org-aggregates';
import {
  DESIGNER_REGION_FILTER_TABS,
  storeMatchesRegionFilter,
  type DesignerRegionFilterKey,
} from '../../lib/designer-region-filter';
import { formatDesignerNamePreview } from '../../lib/designer-name-preview';
import type { VirtualStoreSummary } from '../../lib/org-virtual-simulation';
import { formatAmount } from '../../lib/currency-input';
import { colors } from '../../lib/theme';
import {
  getStoreMetricDetail,
  GlobalStoreMetricTabs,
  type StoreMetricTab,
} from './store-metric-tabs';

const TOP_STORE_LIMIT = 15;

type TopStoresSectionProps = {
  virtualStores: VirtualStoreSummary[];
  designers: OrgDesignerMetrics[];
  viewAllHref?: Href;
};

function sortStoresByMetric(stores: VirtualStoreSummary[], metricTab: StoreMetricTab) {
  const sorted = [...stores];

  switch (metricTab) {
    case 'hq':
      return sorted.sort((left, right) => right.monthHqRevenue - left.monthHqRevenue);
    case 'treatments':
      return sorted.sort((left, right) => right.monthTreatmentCount - left.monthTreatmentCount);
    case 'customers':
      return sorted.sort((left, right) => right.customerCount - left.customerCount);
    case 'designers':
      return sorted.sort((left, right) => right.designerCount - left.designerCount);
    case 'sales':
    default:
      return sorted.sort((left, right) => right.monthGrossSales - left.monthGrossSales);
  }
}

function metricSectionTitle(metricTab: StoreMetricTab) {
  switch (metricTab) {
    case 'hq':
      return '본사 수익 상위 매장';
    case 'treatments':
      return '시술 상위 매장';
    case 'customers':
      return '고객 상위 매장';
    case 'designers':
      return '디자이너 상위 매장';
    case 'sales':
    default:
      return '매출 상위 매장';
  }
}

export function TopStoresSection({ virtualStores, designers, viewAllHref = '/admin/designers' }: TopStoresSectionProps) {
  const [regionFilterKey, setRegionFilterKey] = useState<DesignerRegionFilterKey>('all');
  const [metricTab, setMetricTab] = useState<StoreMetricTab>('sales');

  const filteredStores = useMemo(() => {
    if (regionFilterKey === 'all') {
      return virtualStores;
    }

    return virtualStores.filter((store) => storeMatchesRegionFilter(store, regionFilterKey));
  }, [regionFilterKey, virtualStores]);

  const topStores = useMemo(
    () => sortStoresByMetric(filteredStores, metricTab).slice(0, TOP_STORE_LIMIT),
    [filteredStores, metricTab],
  );

  const regionLabel =
    DESIGNER_REGION_FILTER_TABS.find((tab) => tab.key === regionFilterKey)?.label ?? '전체';

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{metricSectionTitle(metricTab)}</Text>
        <GlobalStoreMetricTabs onTabChange={setMetricTab} tab={metricTab} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
        <View style={styles.regionRow}>
          {DESIGNER_REGION_FILTER_TABS.map((tab) => {
            const selected = tab.key === regionFilterKey;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setRegionFilterKey(tab.key)}
                style={({ pressed }) => [
                  styles.regionChip,
                  selected && styles.regionChipSelected,
                  pressed && styles.regionChipPressed,
                ]}>
                <Text style={[styles.regionChipText, selected && styles.regionChipTextSelected]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.scopeHint}>
        {regionLabel} · {filteredStores.length.toLocaleString('ko-KR')}곳 · 탭 기준 상위 {topStores.length}곳
      </Text>

      {topStores.length === 0 ? (
        <Text style={styles.emptyText}>선택한 지역에 표시할 매장이 없습니다.</Text>
      ) : (
        <View style={styles.grid}>
          {topStores.map((store) => {
            const storeDesigners = designers.filter((designer) => designer.storeId === store.id);
            const metricDetail = getStoreMetricDetail(
              {
                designerCount: store.designerCount,
                designerNames: storeDesigners.map((designer) => designer.name),
                customerCount: store.customerCount,
                monthTreatmentCount: store.monthTreatmentCount,
                monthGrossSales: store.monthGrossSales,
                monthHqRevenue: store.monthHqRevenue,
              },
              metricTab,
            );

            return (
              <View key={store.id} style={styles.card}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeMeta}>
                  {store.region} · 디자이너 {store.designerCount}명
                </Text>
                <View style={styles.metricHighlight}>
                  <Text style={styles.metricValue}>{metricDetail.value}</Text>
                  <Text style={styles.metricMeta}>{metricDetail.meta}</Text>
                </View>
                <Text style={styles.storeMeta}>
                  매출 {formatSalesAmount(store.monthGrossSales)} · 본사{' '}
                  {formatPlainAmount(store.monthHqRevenue)}
                </Text>
                <Text style={styles.hotPlace} numberOfLines={2}>
                  {store.hotPlace}
                </Text>
                <Text style={styles.designers} numberOfLines={2}>
                  {formatDesignerNamePreview(storeDesigners.map((designer) => designer.name))}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Link href={viewAllHref} asChild>
        <Pressable style={({ pressed }) => [styles.viewAllLink, pressed && styles.viewAllPressed]}>
          <Text style={styles.viewAllText}>
            전체 {virtualStores.length.toLocaleString('ko-KR')}개 매장 보기 →
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 8,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  regionScroll: {
    flexGrow: 0,
  },
  regionRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  regionChip: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  regionChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  regionChipPressed: {
    opacity: 0.92,
  },
  regionChipText: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  regionChipTextSelected: {
    color: colors.purple,
    fontWeight: '900',
  },
  scopeHint: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  emptyText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '48%',
  },
  storeName: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
  },
  storeMeta: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  metricHighlight: {
    backgroundColor: '#F7F4FF',
    borderColor: '#E0D7FA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    marginVertical: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  metricValue: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '900',
  },
  metricMeta: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '600',
  },
  hotPlace: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  designers: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  viewAllLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
  },
  viewAllPressed: {
    opacity: 0.85,
  },
  viewAllText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
});
