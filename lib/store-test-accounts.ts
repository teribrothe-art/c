import type { UserRole } from './auth';
import type { BetaTestAccount } from './beta-test-accounts';

/** 매장 접속 · 데모 테스트 계정 */
export const STORE_TEST_ACCOUNT: BetaTestAccount = {
  id: 'store-test',
  email: 'store@hair.app',
  name: '매장',
  password: 'store1234',
  role: 'store' as UserRole,
};

export const STORE_TEST_PUBLIC = {
  id: STORE_TEST_ACCOUNT.id,
  email: STORE_TEST_ACCOUNT.email,
  password: STORE_TEST_ACCOUNT.password,
  loginLabel: '매장 로그인',
} as const;
