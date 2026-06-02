import { StyleSheet, Text, View } from 'react-native';

type DesignerStoreAffiliationBadgeProps = {
  storeName: string;
  storeRegion?: string;
  compact?: boolean;
};

export function DesignerStoreAffiliationBadge({
  storeName,
  storeRegion,
  compact = false,
}: DesignerStoreAffiliationBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>소속 매장</Text>
      <Text style={[styles.storeName, compact && styles.storeNameCompact]} numberOfLines={1}>
        {storeName}
      </Text>
      {storeRegion ? (
        <Text style={[styles.region, compact && styles.regionCompact]} numberOfLines={1}>
          {storeRegion}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'stretch',
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badgeCompact: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labelCompact: {
    fontSize: 10,
  },
  storeName: {
    color: '#134E4A',
    fontSize: 16,
    fontWeight: '900',
  },
  storeNameCompact: {
    fontSize: 13,
  },
  region: {
    color: '#0D9488',
    fontSize: 12,
    fontWeight: '600',
  },
  regionCompact: {
    fontSize: 11,
  },
});
