import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '../../lib/currency-input';
import { formatDesignerNamePreview } from '../../lib/designer-name-preview';
import type { OrgDesignerStoreGroup } from '../../lib/org-aggregates';
import { colors } from '../../lib/theme';

export type StoreMetricTab = 'designers' | 'customers' | 'treatments' | 'sales' | 'hq';

export const STORE_METRIC_TABS: { key: StoreMetricTab; label: string }[] = [
  { key: 'designers', label: '디자이너' },
  { key: 'customers', label: '고객' },
  { key: 'treatments', label: '시술' },
  { key: 'sales', label: '매출' },
  { key: 'hq', label: '본사' },
];

export type StoreMetricSnapshot = {
  designerCount: number;
  designerNames: string[];
  customerCount: number;
  monthTreatmentCount: number;
  monthGrossSales: number;
  monthHqRevenue: number;
};

export function metricsFromStoreGroup(group: OrgDesignerStoreGroup): StoreMetricSnapshot {
  return {
    designerCount: group.designers.length,
    designerNames: group.designers.map((designer) => designer.name),
    customerCount: group.customerCount,
    monthTreatmentCount: group.monthTreatmentCount,
    monthGrossSales: group.monthGrossSales,
    monthHqRevenue: group.monthHqRevenue,
  };
}

export function getStoreMetricDetail(snapshot: StoreMetricSnapshot, tab: StoreMetricTab) {
  switch (tab) {
    case 'designers':
      return {
        value: `${snapshot.designerCount}명`,
        meta: formatDesignerNamePreview(snapshot.designerNames),
      };
    case 'customers':
      return {
        value: `${snapshot.customerCount}명`,
        meta: '소속 디자이너 연결 고객 합계',
      };
    case 'treatments':
      return {
        value: `${snapshot.monthTreatmentCount.toLocaleString('ko-KR')}건`,
        meta: '이번 달 시술 건수',
      };
    case 'sales':
      return {
        value: formatAmount(snapshot.monthGrossSales),
        meta: '이번 달 매출',
      };
    case 'hq':
      return {
        value: formatAmount(snapshot.monthHqRevenue),
        meta: '이번 달 본사 수익',
      };
  }
}

type GlobalStoreMetricTabsProps = {
  tab: StoreMetricTab;
  onTabChange: (next: StoreMetricTab) => void;
};

export function GlobalStoreMetricTabs({ tab, onTabChange }: GlobalStoreMetricTabsProps) {
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

type StoreMetricDetailProps = {
  snapshot: StoreMetricSnapshot;
  tab: StoreMetricTab;
  variant?: 'green' | 'neutral';
};

export function StoreMetricDetail({ snapshot, tab, variant = 'green' }: StoreMetricDetailProps) {
  const detail = getStoreMetricDetail(snapshot, tab);

  return (
    <View
      style={[
        styles.metricsDetail,
        variant === 'green' ? styles.metricsDetailGreen : styles.metricsDetailNeutral,
      ]}>
      <Text
        style={[
          styles.metricsValue,
          variant === 'green' ? styles.metricsValueGreen : styles.metricsValueNeutral,
        ]}>
        {detail.value}
      </Text>
      <Text style={styles.metricsMeta}>{detail.meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  metricsDetail: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricsDetailGreen: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C8E6C9',
  },
  metricsDetailNeutral: {
    backgroundColor: '#FAFAFC',
    borderColor: '#E8E8F0',
  },
  metricsValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricsValueGreen: {
    color: '#1B5E20',
  },
  metricsValueNeutral: {
    color: '#1A1A2E',
  },
  metricsMeta: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
});
