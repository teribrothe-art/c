import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { formatWonDisplay, sanitizeWonDigits } from '../../lib/currency-input';

type WonAmountInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeValue: (digits: string) => void;
};

export function WonAmountInput({
  value,
  onChangeValue,
  placeholder = '0',
  style,
  ...rest
}: WonAmountInputProps) {
  return (
    <TextInput
      {...rest}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      style={[styles.input, style]}
      value={formatWonDisplay(value)}
      onChangeText={(text) => onChangeValue(sanitizeWonDigits(text))}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
});
