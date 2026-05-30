import type { Href } from 'expo-router';

export type DesignerAppTab = {
  key: string;
  label: string;
  href: Href;
};

/** 디자이너 앱 하단 탭 — 홈 · 고객 · 시술 · 매출 · 계정 */
export const DESIGNER_APP_TABS: DesignerAppTab[] = [
  { key: 'home', label: '홈', href: '/designer/home' as Href },
  { key: 'clients', label: '고객', href: '/designer/clients' as Href },
  { key: 'input', label: '시술', href: '/designer/input' as Href },
  { key: 'revenue', label: '매출', href: '/designer/revenue' as Href },
  { key: 'account', label: '계정', href: '/profile' as Href },
];

export const DESIGNER_APP_TAB_LABELS = DESIGNER_APP_TABS.map((tab) => tab.label).join(' · ');

export const DESIGNER_DEMO_TAB_LOGIN = {
  email: 'designer@hair.app',
  password: 'demo1234',
  label: '데모 디자이너 · 김미용',
} as const;
