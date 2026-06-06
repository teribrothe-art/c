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
  /** 한 줄 타일 수 — 폰 화면 기준 4 이하 권장 */
  columns?: 2 | 3 | 4;
};

const TILE_WIDTH_BY_COLUMNS: Record<2 | 3 | 4, `${number}%`> = {
  2: '50%',
  3: '33.333%',
  4: '25%',
};

export function CustomerGrid({ items, onPressItem, columns = 4 }: CustomerGridProps) {
  const tileWidth = TILE_WIDTH_BY_COLUMNS[columns];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={[styles.tileWrap, { width: tileWidth }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${item.subtitle} ${item.meta}`}
            onPress={() => onPressItem(item.key)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.initial ?? getInitial(item.name)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.meta}
            </Text>
            {item.badge ? (
              <Text style={styles.badge} numberOfLines={2}>
                {item.badge}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || '?';
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tileWrap: {
    padding: 4,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    justifyContent: 'flex-start',
    minHeight: 128,
    paddingHorizontal: 6,
    paddingVertical: 10,
    width: '100%',
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
    lineHeight: 14,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
    width: '100%',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 12,
    textAlign: 'center',
    width: '100%',
  },
  badge: {
    color: '#6B6B7B',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 11,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
