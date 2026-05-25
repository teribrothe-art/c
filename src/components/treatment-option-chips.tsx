import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type ChipOption = string | { icon?: string; label: string };

type TreatmentOptionChipsProps = {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
};

function getLabel(option: ChipOption) {
  return typeof option === 'string' ? option : option.label;
}

function getIcon(option: ChipOption) {
  return typeof option === 'string' ? undefined : option.icon;
}

export function TreatmentOptionChips({ options, value, onChange }: TreatmentOptionChipsProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const label = getLabel(option);
        const selected = value === label;

        return (
          <Pressable
            key={label}
            onPress={() => onChange(label)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}>
            {getIcon(option) ? <Text style={styles.chipIcon}>{getIcon(option)}</Text> : null}
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
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
    backgroundColor: '#F3F3F6',
    borderColor: '#E3E3EA',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: colors.lightMint,
    borderColor: colors.mint,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.mint,
    fontWeight: '900',
  },
});
