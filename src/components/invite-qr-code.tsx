import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { createQrMatrix } from '../../lib/qrcode-create';
import { colors } from '../../lib/theme';

type InviteQrCodeProps = {
  value: string;
  size?: number;
};

/** 고객·접속 QR — SVG 없이 View 매트릭스로 렌더 (RNSVG Codegen 경고 방지) */
export function InviteQrCode({ value, size = 200 }: InviteQrCodeProps) {
  const cells = useMemo(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const qr = createQrMatrix(trimmed);
    const count = qr.modules.size;
    const filled: Array<{ x: number; y: number }> = [];

    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.modules.get(row, col) === 1) {
          filled.push({ x: col, y: row });
        }
      }
    }

    return { count, filled };
  }, [value]);

  if (!cells) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  const cellSize = size / cells.count;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {cells.filled.map((cell) => (
        <View
          key={`${cell.x}-${cell.y}`}
          style={{
            backgroundColor: colors.text,
            height: cellSize,
            left: cell.x * cellSize,
            position: 'absolute',
            top: cell.y * cellSize,
            width: cellSize,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#F5F5F8',
    borderRadius: 12,
  },
});
