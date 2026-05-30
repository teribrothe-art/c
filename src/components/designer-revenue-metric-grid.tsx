import { Pressable, StyleSheet, Text, View } from 'react-native';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';

export type DesignerRevenueMetricItem = {
  key: string;
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'success';
  onPress: () => void;
};

type DesignerRevenueMetricGridProps = {
  items: DesignerRevenueMetricItem[];
};

export function DesignerRevenueMetricGrid({ items }: DesignerRevenueMetricGridProps) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`${item.label} ${item.value}`}
          onPress={item.onPress}
          style={({ pressed }) => [styles.metricCard, pressed && styles.metricCardPressed]}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text
            style={[
              styles.metricValue,
              item.tone === 'danger' && styles.metricDanger,
              item.tone === 'success' && styles.metricSuccess,
            ]}>
            {item.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 92,
    padding: 14,
    width: '48%',
  },
  metricCardPressed: {
    backgroundColor: '#F5F5F8',
    borderColor: '#D1D5DB',
    opacity: 0.92,
  },
  metricLabel: { color: '#6B6B7B', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  metricValue: { color: '#1A1A2E', fontSize: 20, fontWeight: '900' },
  metricDanger: { color: CORAL },
  metricSuccess: { color: MINT },
});
