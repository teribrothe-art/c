declare module 'qrcode/lib/core/qrcode' {
  export type QrEncoded = {
    modules: {
      size: number;
      data: Array<number | boolean>;
    };
  };

  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): QrEncoded;
}
