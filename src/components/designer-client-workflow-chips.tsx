import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DESIGNER_CLIENT_WORKFLOW_STEPS,
  type DesignerClientWorkflowStep,
} from '../../lib/designer-client-workflow';
import { colors } from '../../lib/theme';

const CHIPS_PER_ROW = 4;

type DesignerClientWorkflowChipsProps = {
  selected: DesignerClientWorkflowStep | 'all';
  counts: Record<DesignerClientWorkflowStep, number>;
  totalCount: number;
  onSelect: (step: DesignerClientWorkflowStep | 'all') => void;
};

export function DesignerClientWorkflowChips({
  selected,
  counts,
  totalCount,
  onSelect,
}: DesignerClientWorkflowChipsProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.chipWrap}>
        <Pressable
          onPress={() => onSelect('all')}
          style={({ pressed }) => [
            styles.chip,
            selected === 'all' && styles.chipSelected,
            pressed && styles.chipPressed,
          ]}>
          <Text style={[styles.chipText, selected === 'all' && styles.chipTextSelected]}>전체</Text>
          <Text style={[styles.chipMeta, selected === 'all' && styles.chipMetaSelected]}>
            {totalCount}건
          </Text>
        </Pressable>
      </View>

      {DESIGNER_CLIENT_WORKFLOW_STEPS.map((step) => {
        const active = selected === step.key;
        const count = counts[step.key];

        return (
          <View key={step.key} style={styles.chipWrap}>
            <Pressable
              onPress={() => onSelect(step.key)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipSelected,
                active && { borderColor: step.accent },
                pressed && styles.chipPressed,
              ]}>
              <Text style={[styles.chipText, active && { color: step.accent }]}>{step.shortLabel}</Text>
              <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>{count}건</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const chipWidth = `${100 / CHIPS_PER_ROW}%`;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    marginHorizontal: -4,
  },
  chipWrap: {
    padding: 4,
    width: chipWidth,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF5A5F',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#FF5A5F',
  },
  chipMeta: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  chipMetaSelected: {
    color: colors.mint,
  },
  chipMetaActive: {
    color: colors.mint,
  },
});
