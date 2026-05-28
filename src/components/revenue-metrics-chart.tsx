import { StyleSheet, Text, View } from 'react-native';

import { RevenueBarChart } from './revenue-bar-chart';

const MINT = '#00C2A8';
const CORAL = '#FF5A5F';

export type RevenueMetricsChartData = {
  treatmentLabel: string;
  treatmentLabelSub?: string;
  treatmentCount: number;
  periodLabel: string;
  periodLabelSub?: string;
  periodTotal: number;
  pendingCount: number;
  pendingAmount: number;
};

type RevenueMetricsChartProps = {
  data: RevenueMetricsChartData;
  title?: string;
};

export function RevenueMetricsChart({ data, title = '요약 지표' }: RevenueMetricsChartProps) {
  const countPoints = [
    {
      key: 'treatment',
      label: data.treatmentLabel,
      value: data.treatmentCount,
      subLabel: data.treatmentLabelSub,
      barColor: MINT,
    },
    {
      key: 'pending-count',
      label: '대기 건수',
      value: data.pendingCount,
      barColor: CORAL,
    },
  ];

  const amountPoints = [
    {
      key: 'period-total',
      label: data.periodLabel,
      value: data.periodTotal,
      subLabel: data.periodLabelSub,
      barColor: MINT,
    },
    {
      key: 'pending-amount',
      label: '정산 대기',
      value: data.pendingAmount,
      barColor: CORAL,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={88}
        points={countPoints}
        valueSuffix="건"
      />
      <RevenueBarChart
        barColor={MINT}
        embedded
        maxBarHeight={88}
        points={amountPoints}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    gap: 8,
    padding: 16,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
});
