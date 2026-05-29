/** DB `payments.fee_rate` 기본값(0.04)과 동일 */
export const PLATFORM_FEE_RATE = 0.04;

export function calculatePaymentFees(amount: number, feeRate = PLATFORM_FEE_RATE) {
  const feeAmount = Math.round(amount * feeRate);
  const designerPayout = amount - feeAmount;

  return {
    feeRate,
    feeAmount,
    designerPayout,
  };
}
