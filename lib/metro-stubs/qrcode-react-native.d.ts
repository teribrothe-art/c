declare module 'qrcode' {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): {
    modules: {
      size: number;
      data: Array<number | boolean>;
    };
  };
}
