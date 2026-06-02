import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountSettingItem } from '../../lib/account-settings';

type AccountMenuRow = AccountSettingItem & {
  onPress?: () => void;
};

type AccountMenuCardProps = {
  title?: string;
  rows: AccountMenuRow[];
};

export function AccountMenuCard({ title, rows }: AccountMenuCardProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {rows.map((row, index) => (
        <View key={row.label}>
          <Pressable
            onPress={row.onPress ?? (() => {})}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <Text style={styles.icon}>{row.icon}</Text>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
          {index < rows.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 18,
    width: 24,
  },
  label: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  arrow: {
    color: '#9B9BA7',
    fontSize: 22,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: '#EFEFF4',
    height: 1,
  },
});
