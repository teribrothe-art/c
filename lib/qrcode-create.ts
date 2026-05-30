/**
 * QR matrix 생성 (Metro stub — Node fs/canvas 없이 core만 사용)
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { create } = require('qrcode') as {
  create: (
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ) => {
    modules: {
      size: number;
      get: (row: number, col: number) => number;
    };
  };
};

export function createQrMatrix(text: string) {
  return create(text, { errorCorrectionLevel: 'M' });
}
