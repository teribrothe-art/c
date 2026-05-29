import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  PRIMARY_VIRTUAL_SIMULATION_SCENARIOS,
  type VirtualSimulationScenario,
} from '../../lib/org-virtual-simulation';
import { colors } from '../../lib/theme';

type Props = {
  scenario: VirtualSimulationScenario;
  onChange: (scenario: VirtualSimulationScenario) => void;
};

export function SimulationScenarioPicker({ scenario, onChange }: Props) {
  return (
    <View style={styles.row}>
      {PRIMARY_VIRTUAL_SIMULATION_SCENARIOS.map((item) => {
        const selected = scenario === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  chipText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#0F766E',
  },
});
