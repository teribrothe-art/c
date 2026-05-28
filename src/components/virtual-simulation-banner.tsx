import { StyleSheet, Text, View } from 'react-native';

import type { VirtualSimulationScenario } from '../../lib/org-virtual-simulation';
import { VIRTUAL_SIMULATION_SCENARIOS } from '../../lib/org-virtual-simulation';

type Props = {
  scenario: VirtualSimulationScenario;
};

export function VirtualSimulationBanner({ scenario }: Props) {
  const meta = VIRTUAL_SIMULATION_SCENARIOS.find((item) => item.key === scenario);

  return (
    <View style={styles.banner}>
      <Text style={styles.badge}>가상 시뮬레이션</Text>
      <Text style={styles.title}>{meta?.label ?? '평일 운영'}</Text>
      <Text style={styles.subtitle}>
        {meta?.description ?? '실제 디자이너·고객 데이터와 합성된 운영 시나리오입니다.'}
      </Text>
    </View>
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
