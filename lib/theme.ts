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
