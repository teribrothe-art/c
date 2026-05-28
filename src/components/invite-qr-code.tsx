import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildInviteQrMatrix } from '../../lib/invite-qr-matrix';
import { colors } from '../../lib/theme';

type InviteQrCodeProps = {
  value: string;
  size?: number;
};

/** 고객 초대 QR (View 픽셀 — Expo Go에서 react-native-svg 네이티브 오류 방지) */
export function InviteQrCode({ value, size = 200 }: InviteQrCodeProps) {
  const matrix = useMemo(() => buildInviteQrMatrix(value), [value]);

  if (!matrix) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  const cellSize = size / matrix.size;

  return (
    <View style={[styles.wrap, { width: size, height: size, backgroundColor: '#FFFFFF' }]}>
      {matrix.cells.map((row, rowIndex) => (
        <View key={`r-${rowIndex}`} style={styles.row}>
          {row.map((filled, colIndex) => (
            <View
              key={`c-${rowIndex}-${colIndex}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: filled ? colors.text : '#FFFFFF',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  placeholder: {
    backgroundColor: '#F5F5F8',
    borderRadius: 12,
  },
});
