import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DESIGNER_CLIENT_WORKFLOW_STEPS,
  type DesignerClientWorkflowStep,
} from '../../lib/designer-client-workflow';

type DesignerClientWorkflowOverviewProps = {
  counts: Record<DesignerClientWorkflowStep, number>;
  onPressStep: (step: DesignerClientWorkflowStep) => void;
};

export function DesignerClientWorkflowOverview({
  counts,
  onPressStep,
}: DesignerClientWorkflowOverviewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>단계를 눌러 해당 시술 목록 보기</Text>

      <View style={styles.grid}>
        {DESIGNER_CLIENT_WORKFLOW_STEPS.map((step) => (
          <View key={step.key} style={styles.tileWrap}>
            <Pressable
              accessibilityLabel={`${step.label} ${counts[step.key]}건`}
              accessibilityRole="button"
              onPress={() => onPressStep(step.key)}
              style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
                { borderColor: `${step.accent}33` },
              ]}>
              <Text style={[styles.order, { color: step.accent }]}>{step.order}</Text>
              <Text style={styles.label}>{step.shortLabel}</Text>
              <Text style={styles.description}>{step.description}</Text>
              <Text style={[styles.count, { color: step.accent }]}>{counts[step.key]}건</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  hint: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tileWrap: {
    aspectRatio: 0.92,
    padding: 4,
    width: '33.333%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tilePressed: {
    backgroundColor: '#FAFAFC',
    opacity: 0.95,
  },
  order: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  label: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  description: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  count: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
});
