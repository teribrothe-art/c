import type { UserRole } from './auth';
import type { BetaTestAccount } from './beta-test-accounts';

/** 매장 본사 접속 어드민 · 데모 테스트 계정 */
export const ADMIN_TEST_ACCOUNT: BetaTestAccount = {
  id: 'hq-admin-test',
  email: 'admin@hair.app',
  name: '본사 어드민',
  password: 'admin1234',
  role: 'admin' as UserRole,
};

export const ADMIN_TEST_PUBLIC = {
  id: ADMIN_TEST_ACCOUNT.id,
  email: ADMIN_TEST_ACCOUNT.email,
  password: ADMIN_TEST_ACCOUNT.password,
  loginLabel: '본사 어드민 로그인',
} as const;
