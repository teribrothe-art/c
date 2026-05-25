import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

export const DAMAGE_LEVEL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type DamageLevelPickerProps = {
  value: number | null | undefined;
  disabled?: boolean;
  onSelect: (level: number) => void;
};

export function DamageLevelPicker({ value, disabled, onSelect }: DamageLevelPickerProps) {
  return (
    <View style={styles.wrap}>
      {DAMAGE_LEVEL_VALUES.map((level) => {
        const selected = value === level;

        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={disabled}
            hitSlop={4}
            onPress={() => onSelect(level)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              disabled && styles.chipDisabled,
              pressed && !disabled && styles.chipPressed,
            ]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 10,
  },
  chipSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
