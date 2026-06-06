import { StyleSheet, Text } from 'react-native';

import {
  formatTreatmentDisplayDate,
  getTreatmentWeekdayColor,
  getTreatmentWeekdayIndex,
  getTreatmentWeekdayLabel,
} from '../../lib/designer-customer-grid';

type DesignerClientDateSectionTitleProps = {
  date: string;
  count: number;
};

export function DesignerClientDateSectionTitle({ date, count }: DesignerClientDateSectionTitleProps) {
  const weekdayIndex = getTreatmentWeekdayIndex(date);
  const weekday = getTreatmentWeekdayLabel(date);
  const weekdayColor = getTreatmentWeekdayColor(weekdayIndex);

  return (
    <Text style={styles.sectionTitle}>
      {formatTreatmentDisplayDate(date)} ·{' '}
      <Text style={[styles.weekday, { color: weekdayColor }]}>{weekday}</Text>
      {' · '}
      {count.toLocaleString('ko-KR')}건
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  weekday: {
    fontWeight: '900',
  },
});
