import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VirtualSimulationScenario } from '../../lib/org-virtual-simulation';
import { VIRTUAL_SIMULATION_SCENARIOS } from '../../lib/org-virtual-simulation';

type Props = {
  scenario: VirtualSimulationScenario;
  onPress?: () => void;
};

export function VirtualSimulationBanner({ scenario, onPress }: Props) {
  const meta = VIRTUAL_SIMULATION_SCENARIOS.find((item) => item.key === scenario);

  const content = (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.badge}>가상 시뮬레이션</Text>
        {onPress ? <Text style={styles.tapHint}>시나리오 보기 ›</Text> : null}
      </View>
      <Text style={styles.title}>{meta?.label ?? '평일 운영'}</Text>
      <Text style={styles.subtitle}>
        {meta?.description ?? '실제 디자이너·고객 데이터와 합성된 운영 시나리오입니다.'}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.banner}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.banner, styles.bannerPressable, pressed && styles.bannerPressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerPressable: {
    borderColor: '#5EEAD4',
  },
  bannerPressed: {
    opacity: 0.92,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tapHint: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#134E4A',
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});
