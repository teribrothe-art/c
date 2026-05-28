import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type DesignerWelcomeTodayCardProps = {
  monthTreatmentCount: number;
  pendingSettlementCount: number;
  regularCustomerCount: number;
};

function StatCell({
  label,
  value,
  unit,
  onPress,
}: {
  label: string;
  value: string;
  unit: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statPressable, pressed && styles.statPressed]}>
      {content}
    </Pressable>
  );
}

export function DesignerWelcomeTodayCard({
  monthTreatmentCount,
  pendingSettlementCount,
  regularCustomerCount,
}: DesignerWelcomeTodayCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>오늘의 살롱</Text>
      <Text style={styles.hint}>메시지를 넘기며 하루를 시작하고, 바로 업무로 이어가 보세요</Text>

      <View style={styles.statRow}>
        <StatCell
          label="이번 달 시술"
          value={String(monthTreatmentCount)}
          unit="건"
          onPress={() => router.push({ pathname: '/designer/clients', params: { filter: 'month' } })}
        />
        <View style={styles.statDivider} />
        <StatCell
          label="정산 대기"
          value={String(pendingSettlementCount)}
          unit="건"
          onPress={() =>
            router.push({ pathname: '/designer/clients', params: { filter: 'escrow' } })
          }
        />
        <View style={styles.statDivider} />
        <StatCell
          label="단골 고객"
          value={String(regularCustomerCount)}
          unit="명"
          onPress={() => router.push('/designer/clients')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  statRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    marginTop: 4,
  },
  statPressable: {
    flex: 1,
  },
  statPressed: {
    opacity: 0.85,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    paddingVertical: 6,
  },
  statDivider: {
    alignSelf: 'center',
    backgroundColor: '#EFEFF4',
    height: 36,
    width: 1,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    color: colors.purple,
    fontSize: 20,
    fontWeight: '900',
  },
  statUnit: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
});
