/** 테스트 로그인 타일·행 공통 타입 (무거운 계정 모듈 import 없음) */
export type DemoLoginAccount = {
  id: string;
  group: string;
  roleLabel: string;
  loginLabel: string;
  email: string;
  password: string;
  meta?: string;
  customerCount?: number;
  accent: string;
  searchHaystack?: string;
};
