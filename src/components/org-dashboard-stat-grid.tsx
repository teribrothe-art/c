import { Pressable, StyleSheet, Text, View } from 'react-native';

export type OrgDashboardStatCardItem = {
  key: string;
  label: string;
  value: string;
  meta?: string;
  onPress: () => void;
};

type OrgDashboardStatGridProps = {
  items: OrgDashboardStatCardItem[];
};

export function OrgDashboardStatGrid({ items }: OrgDashboardStatGridProps) {
  return (
    <View style={styles.cardGrid}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`${item.label} ${item.value}${item.meta ? ` ${item.meta}` : ''}`}
          onPress={item.onPress}
          style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={styles.statValue}>{item.value}</Text>
          {item.meta ? <Text style={styles.statMeta}>{item.meta}</Text> : null}
          <Text style={styles.statTapHint}>탭하여 이동</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 96,
    padding: 14,
    width: '48%',
  },
  statCardPressed: {
    backgroundColor: '#F5F5F8',
    borderColor: '#D1D5DB',
    opacity: 0.92,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  statMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  statTapHint: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
