import { StyleSheet, View } from 'react-native';

import type { DesignerClientDateGroup } from '../../lib/designer-customer-grid';
import type { DesignerClientWorkflowStep } from '../../lib/designer-client-workflow';
import { CustomerGrid } from './customer-grid';
import { DesignerClientDateSectionTitle } from './designer-client-date-section-title';
import { DesignerClientMonthCalendar } from './designer-client-month-calendar';
import { DesignerClientWorkflowOverview } from './designer-client-workflow-overview';
import { DesignerDateOverviewGrid } from './designer-date-overview-grid';

type CustomerGridByDateProps = {
  groups: DesignerClientDateGroup[];
  onPressItem: (key: string) => void;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  showWorkflowOverview?: boolean;
  showDateOverview?: boolean;
  showDateChipRow?: boolean;
  calendarMonth?: { year: number; month: number };
  onCalendarMonthChange?: (year: number, month: number) => void;
  earliestDateKey?: string | null;
  workflowCounts?: Record<DesignerClientWorkflowStep, number>;
  onSelectWorkflowStep?: (step: DesignerClientWorkflowStep) => void;
};

export function CustomerGridByDate({
  groups,
  onPressItem,
  selectedDate = null,
  onSelectDate,
  showWorkflowOverview = false,
  showDateOverview = false,
  showDateChipRow = true,
  calendarMonth,
  onCalendarMonthChange,
  earliestDateKey = null,
  workflowCounts,
  onSelectWorkflowStep,
}: CustomerGridByDateProps) {
  const visibleGroups = showWorkflowOverview || showDateOverview
    ? []
    : groups.filter((group) => (selectedDate === null ? true : group.date === selectedDate));

  return (
    <View style={styles.wrapper}>
      {onSelectDate && groups.length > 0 && showDateChipRow && calendarMonth && onCalendarMonthChange ? (
        <DesignerClientMonthCalendar
          earliestDateKey={earliestDateKey}
          groups={groups}
          month={calendarMonth.month}
          selectedDate={selectedDate}
          year={calendarMonth.year}
          onChangeMonth={onCalendarMonthChange}
          onSelectDate={onSelectDate}
        />
      ) : null}

      {showWorkflowOverview && workflowCounts && onSelectWorkflowStep ? (
        <DesignerClientWorkflowOverview counts={workflowCounts} onPressStep={onSelectWorkflowStep} />
      ) : null}

      {showDateOverview && onSelectDate ? (
        <DesignerDateOverviewGrid groups={groups} onPressDate={onSelectDate} />
      ) : null}

      {visibleGroups.map((group) => (
        <View key={group.date} style={styles.section}>
          <View style={styles.sectionHeader}>
            <DesignerClientDateSectionTitle count={group.count} date={group.date} />
          </View>
          <CustomerGrid items={group.items} onPressItem={onPressItem} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
