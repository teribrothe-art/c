/** 테스트 로그인 타일·행 공통 타입 (무거운 계정 모듈 import 없음) */
export type DemoLoginAccount = {
  id: string;
  group: string;
  roleLabel: string;
  loginLabel: string;
  /** 타일에 크게 표시할 이름 (증원 디자이너 등) */
  displayName?: string;
  email: string;
  password: string;
  meta?: string;
  customerCount?: number;
  accent: string;
  searchHaystack?: string;
};
