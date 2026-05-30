import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VirtualSimulationScenario } from '../../lib/org-virtual-simulation';
import { VIRTUAL_SIMULATION_SCENARIOS } from '../../lib/org-virtual-simulation';

const SPLIT_SCENARIOS: VirtualSimulationScenario[] = ['weekday', 'weekend_peak'];

type Props = {
  scenario: VirtualSimulationScenario;
  layout?: 'single' | 'split';
  onScenarioChange?: (scenario: VirtualSimulationScenario) => void;
};

function getScenarioMeta(scenario: VirtualSimulationScenario) {
  return VIRTUAL_SIMULATION_SCENARIOS.find((item) => item.key === scenario);
}

export function VirtualSimulationBanner({
  scenario,
  layout = 'split',
  onScenarioChange,
}: Props) {
  if (layout === 'single') {
    const meta = getScenarioMeta(scenario);

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

  return (
    <View style={styles.splitWrap}>
      <Text style={styles.badge}>가상 시뮬레이션</Text>
      <View style={styles.splitRow}>
        {SPLIT_SCENARIOS.map((key) => {
          const meta = getScenarioMeta(key);
          const active = scenario === key;
          const cell = (
            <View
              style={[
                styles.splitCell,
                active ? styles.splitCellActive : styles.splitCellIdle,
              ]}>
              <Text style={[styles.splitTitle, active && styles.splitTitleActive]}>
                {meta?.label ?? key}
              </Text>
              <Text style={[styles.splitSubtitle, active && styles.splitSubtitleActive]}>
                {meta?.description ?? ''}
              </Text>
            </View>
          );

          if (!onScenarioChange) {
            return (
              <View key={key} style={styles.splitCellWrap}>
                {cell}
              </View>
            );
          }

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onScenarioChange(key)}
              style={({ pressed }) => [
                styles.splitCellWrap,
                pressed && styles.splitCellPressed,
              ]}>
              {cell}
            </Pressable>
          );
        })}
      </View>
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
  splitWrap: {
    gap: 8,
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
  splitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCellWrap: {
    flex: 1,
  },
  splitCell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  splitCellIdle: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
  },
  splitCellActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  splitCellPressed: {
    opacity: 0.92,
  },
  splitTitle: {
    color: '#5EEAD4',
    fontSize: 14,
    fontWeight: '900',
  },
  splitTitleActive: {
    color: '#134E4A',
  },
  splitSubtitle: {
    color: '#99F6E4',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  splitSubtitleActive: {
    color: '#0F766E',
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
