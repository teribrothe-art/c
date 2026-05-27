import {
  ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE,
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  ACCUMULATED_TEST_PASSWORD,
} from './demo-accumulated-test-data';

export type AccumulatedDesignerShortcut = {
  id: string;
  profileKey: '1y' | '2y' | '3y';
  loginLabel: string;
  email: string;
  password: string;
  meta?: string;
  accent: string;
};

const ACCENT_BY_PROFILE = {
  '1y': '#00C2A8',
  '2y': '#7B5EE6',
  '3y': '#E85D4C',
} as const;

export const ACCUMULATED_DESIGNER_SHORTCUTS: AccumulatedDesignerShortcut[] =
  ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) => {
    const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[designer.profileKey];

    return {
      id: designer.id,
      profileKey: designer.profileKey,
      loginLabel: designer.loginLabel,
      email: designer.email,
      password: designer.password,
      meta: stats
        ? `${stats.yearSpanLabel} · 시술 ${stats.treatmentCount}건 · 고객 ${stats.customerCount}명`
        : undefined,
      accent: ACCENT_BY_PROFILE[designer.profileKey],
    };
  });

/** 기본 바로가기: 3년 누적 테스트 디자이너 */
export const PRIMARY_ACCUMULATED_DESIGNER =
  ACCUMULATED_DESIGNER_SHORTCUTS.find((item) => item.profileKey === '3y') ??
  ACCUMULATED_DESIGNER_SHORTCUTS[0];

export const ACCUMULATED_DESIGNER_LOGIN_HINT = {
  password: ACCUMULATED_TEST_PASSWORD,
} as const;
