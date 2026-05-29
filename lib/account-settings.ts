export type AccountSettingItem = {
  icon: string;
  label: string;
};

export const ACCOUNT_SETTING_ITEMS: AccountSettingItem[] = [
  { icon: '✏️', label: '프로필 수정' },
  { icon: '🔔', label: '알림 설정' },
  { icon: '🔒', label: '개인정보 처리방침' },
  { icon: '❓', label: '도움말' },
];
