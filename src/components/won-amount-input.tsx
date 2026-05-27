import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { formatWonDisplay, sanitizeWonDigits } from '../../lib/currency-input';
import { formTextInputStyle } from '../../lib/theme';

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
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        keyboardAppearance="light"
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, formTextInputStyle, style]}
        value={formatWonDisplay(value)}
        onChangeText={(text) => onChangeValue(sanitizeWonDigits(text))}
      />
      <Text style={styles.suffix}>원</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  input: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suffix: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 22,
  },
});
