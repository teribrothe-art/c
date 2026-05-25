import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getTreatmentTypeIcon } from '../../lib/diary-filters';
import type { Treatment } from '../../lib/treatments';

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

type TreatmentDiaryCardProps = {
  onPress: () => void;
  treatment: Treatment;
};

export function TreatmentDiaryCard({ onPress, treatment }: TreatmentDiaryCardProps) {
  const typeIcon = getTreatmentTypeIcon(treatment.treatment_type);

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <Text style={styles.cardMeta}>
        {formatDate(treatment.treatment_date)} {treatment.designer_name ?? '담당 디자이너'}
      </Text>
      <Text style={styles.cardTitle}>{treatment.treatment_title}</Text>
      <View style={styles.tagRow}>
        <View style={[styles.tag, styles.typeTag]}>
          <Text style={[styles.tagText, styles.typeTagText]}>
            {typeIcon} #{treatment.treatment_type}
          </Text>
        </View>
        {typeof treatment.damage_level === 'number' ? (
          <View style={[styles.tag, styles.damageTag]}>
            <Text style={[styles.tagText, styles.damageTagText]}>#손상{treatment.damage_level}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    elevation: 4,
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  cardPressed: {
    opacity: 0.82,
  },
  cardMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeTag: {
    backgroundColor: '#FFD4D5',
  },
  typeTagText: {
    color: '#FF5A5F',
  },
  damageTag: {
    backgroundColor: '#CCF2EC',
  },
  damageTagText: {
    color: '#00C2A8',
  },
});
