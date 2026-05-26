import { create as createQrCode } from 'qrcode/lib/core/qrcode';

export type QrMatrix = {
  size: number;
  cells: boolean[][];
};

export function buildInviteQrMatrix(value: string): QrMatrix | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const encoded = createQrCode(trimmed, { errorCorrectionLevel: 'M' });
    const size = encoded.modules.size;
    const data = encoded.modules.data as Array<number | boolean>;
    const cells: boolean[][] = [];

    for (let row = 0; row < size; row += 1) {
      const line: boolean[] = [];

      for (let col = 0; col < size; col += 1) {
        line.push(Boolean(data[row * size + col]));
      }

      cells.push(line);
    }

    return { size, cells };
  } catch {
    return null;
  }
}
