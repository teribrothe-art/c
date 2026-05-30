export const colors = {
  coral: '#FF5A5F',
  mint: '#00C2A8',
  purple: '#7B5EE6',
  gold: '#FFB627',
  text: '#1A1A2E',
  muted: '#6B6B7B',
  background: '#FAFAFC',
  disabled: '#CCCCCC',
  danger: '#FF5A5F',
  error: '#FF5A5F',
  lightCoral: '#FFD4D5',
  lightPurple: '#E0D7FA',
  lightMint: '#CCF2EC',
} as const;

export const disabledButtonStyle = {
  backgroundColor: colors.disabled,
  opacity: 0.5,
} as const;

/** 로그인 화면 중앙 컬럼 (좌우 여백·최대 너비) */
export const loginLayout = {
  maxContentWidth: 400,
  horizontalPadding: 36,
} as const;

export function getLoginContentWidth(windowWidth: number) {
  return Math.min(
    windowWidth - loginLayout.horizontalPadding * 2,
    loginLayout.maxContentWidth,
  );
}
