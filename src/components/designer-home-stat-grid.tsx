import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DesignerHomeStatItem = {
  key: string;
  label: string;
  value: string;
  href: Href;
};

type DesignerHomeStatGridProps = {
  items: DesignerHomeStatItem[];
};

export function currentDesignerMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function DesignerHomeStatGrid({ items }: DesignerHomeStatGridProps) {
  return (
    <View style={styles.statGrid}>
      {items.map((item) => (
        <View key={item.key} style={styles.statTileWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${item.value}`}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [styles.statTile, pressed && styles.statTilePressed]}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {item.value}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statTileWrap: {
    aspectRatio: 1,
    padding: 4,
    width: '25%',
  },
  statTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  statTilePressed: {
    backgroundColor: '#F5F5F8',
    borderColor: '#D1D5DB',
    opacity: 0.92,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
});
