import { Pressable, StyleSheet, Text, View } from 'react-native';

export type CustomerGridItem = {
  key: string;
  name: string;
  subtitle: string;
  meta: string;
  badge?: string;
  initial?: string;
};

type CustomerGridProps = {
  items: CustomerGridItem[];
  onPressItem: (key: string) => void;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1) || '?';
}

export function CustomerGrid({ items, onPressItem }: CustomerGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={styles.tileWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${item.subtitle} ${item.meta}`}
            onPress={() => onPressItem(item.key)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.initial ?? getInitial(item.name)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.meta}
            </Text>
            {item.badge ? (
              <Text style={styles.badge} numberOfLines={1}>
                {item.badge}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tileWrap: {
    aspectRatio: 1,
    padding: 4,
    width: '25%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tilePressed: {
    backgroundColor: '#F5F5F8',
    borderColor: '#D1D5DB',
    opacity: 0.92,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginBottom: 4,
    width: 32,
  },
  avatarText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '900',
  },
  name: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  badge: {
    color: '#6B6B7B',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
