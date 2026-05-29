import { Pressable, StyleSheet, Text, View } from 'react-native';

type DesignerStoreAffiliationBadgeProps = {
  storeName: string;
  storeRegion?: string;
  compact?: boolean;
  onPress?: () => void;
};

export function DesignerStoreAffiliationBadge({
  storeName,
  storeRegion,
  compact = false,
  onPress,
}: DesignerStoreAffiliationBadgeProps) {
  const content = (
    <>
      <View style={styles.labelRow}>
        <Text style={[styles.label, compact && styles.labelCompact]}>소속 매장</Text>
        {onPress ? <Text style={styles.tapHint}>탭하여 분배 보기 ›</Text> : null}
      </View>
      <Text style={[styles.storeName, compact && styles.storeNameCompact]} numberOfLines={1}>
        {storeName}
      </Text>
      {storeRegion ? (
        <Text style={[styles.region, compact && styles.regionCompact]} numberOfLines={1}>
          {storeRegion}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.badge, compact && styles.badgeCompact]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.badge,
        compact && styles.badgeCompact,
        styles.badgePressable,
        pressed && styles.badgePressed,
      ]}>
      {content}
    </Pressable>
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
  badgePressable: {
    borderColor: '#5EEAD4',
  },
  badgePressed: {
    opacity: 0.92,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tapHint: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
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
