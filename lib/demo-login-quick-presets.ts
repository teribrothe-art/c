import { ADMIN_TEST_PUBLIC } from './admin-test-accounts';
import { DEMO_LOGIN_HINT } from './auth';
import { BETA_TEST_PASSWORD } from './beta-test-accounts';
import { ACCUMULATED_TEST_PASSWORD } from './demo-accumulated-test-accounts';
import { FLEET_100_TEST_PASSWORD } from './demo-fleet-100-designers';

export type DemoQuickLoginPreset = {
  id: string;
  label: string;
  email: string;
  password: string;
  accent: string;
};

/** 테스트 로그인 상단 — 즉시 로그인 (무거운 목록 로드 없음) */
export const DEMO_QUICK_LOGIN_PRESETS: DemoQuickLoginPreset[] = [
  {
    id: 'quick-demo-customer',
    label: '데모 고객',
    email: DEMO_LOGIN_HINT.customerEmail,
    password: DEMO_LOGIN_HINT.customerPassword,
    accent: '#7B5EE6',
  },
  {
    id: 'quick-demo-designer',
    label: '데모 디자이너',
    email: DEMO_LOGIN_HINT.designerEmail,
    password: DEMO_LOGIN_HINT.designerPassword,
    accent: '#7B5EE6',
  },
  {
    id: 'quick-admin',
    label: '본사 어드민',
    email: ADMIN_TEST_PUBLIC.email,
    password: ADMIN_TEST_PUBLIC.password,
    accent: '#4B5563',
  },
  {
    id: 'quick-store',
    label: '강남 매장',
    email: 'store-gangnam@hair.app',
    password: 'store1234',
    accent: '#0284C7',
  },
  {
    id: 'quick-beta-designer',
    label: '베타 디자이너 1',
    email: 'beta-designer-1@hair.app',
    password: BETA_TEST_PASSWORD,
    accent: '#9B8AFB',
  },
  {
    id: 'quick-fleet-001',
    label: '증원 1년차',
    email: 'test-fleet-001@hair.app',
    password: FLEET_100_TEST_PASSWORD,
    accent: '#7B5EE6',
  },
  {
    id: 'quick-accum-1y',
    label: '누적 1년',
    email: 'test-designer-1y@hair.app',
    password: ACCUMULATED_TEST_PASSWORD,
    accent: '#00C2A8',
  },
];
