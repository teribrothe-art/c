import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_HINT } from './auth';
import { ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE } from './demo-accumulated-test-data';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from './demo-accumulated-test-accounts';
import { STORE_TEST_PUBLIC } from './store-test-accounts';
import { colors } from './theme';

export type DemoLoginAccount = {
  id: string;
  group: string;
  roleLabel: string;
  loginLabel: string;
  email: string;
  password: string;
  meta?: string;
  accent: string;
};

const BASIC_ACCOUNTS: DemoLoginAccount[] = [
  {
    id: 'demo-customer',
    group: '기본',
    roleLabel: '고객',
    loginLabel: '데모 고객',
    email: DEMO_LOGIN_HINT.customerEmail,
    password: DEMO_LOGIN_HINT.customerPassword,
    accent: colors.coral,
  },
  {
    id: 'demo-designer',
    group: '기본',
    roleLabel: '디자이너',
    loginLabel: '데모 디자이너',
    email: DEMO_LOGIN_HINT.designerEmail,
    password: DEMO_LOGIN_HINT.designerPassword,
    accent: '#7B5EE6',
  },
  {
    id: STORE_TEST_PUBLIC.id,
    group: '기본',
    roleLabel: '매장',
    loginLabel: '데모 매장',
    email: STORE_TEST_PUBLIC.email,
    password: STORE_TEST_PUBLIC.password,
    accent: '#0284C7',
  },
  {
    id: ADMIN_TEST_PUBLIC.id,
    group: '기본',
    roleLabel: '어드민',
    loginLabel: '데모 어드민',
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    accent: '#4B5563',
  },
];

const ACCUMULATED_ACCOUNTS: DemoLoginAccount[] = ACCUMULATED_TEST_DESIGNERS_PUBLIC.map(
  (designer) => {
    const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[designer.profileKey];
    const accent =
      designer.profileKey === '1y'
        ? '#00C2A8'
        : designer.profileKey === '3y'
          ? '#E85D4C'
          : '#7B5EE6';

    return {
      id: designer.id,
      group: '누적 테스트 디자이너',
      roleLabel: '디자이너',
      loginLabel: designer.loginLabel,
      email: designer.email,
      password: designer.password,
      meta: stats
        ? `${stats.yearSpanLabel} · 시술 ${stats.treatmentCount}건 · 고객 ${stats.customerCount}명`
        : undefined,
      accent,
    };
  },
);

export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  ...BASIC_ACCOUNTS,
  ...ACCUMULATED_ACCOUNTS,
];

export const DEMO_LOGIN_GROUPS = Array.from(
  new Set(DEMO_LOGIN_ACCOUNTS.map((account) => account.group)),
).map((title) => ({
  title,
  accounts: DEMO_LOGIN_ACCOUNTS.filter((account) => account.group === title),
}));
