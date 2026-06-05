import { DESIGNER_APP_TAB_LABELS } from './designer-app-tabs';
import { INCLUDED_DEMO_TEST_DESIGNER_COUNT } from './demo-designer-customer-counts';

/** 테스트 로그인 화면 분류 순서 (경량 — demo-login-accounts import 없음) */
export const DEMO_LOGIN_GROUP_ORDER = ['본사', '매장', '디자이너', '가입고객'] as const;

export type DemoLoginGroupKey = (typeof DEMO_LOGIN_GROUP_ORDER)[number];

export const DEMO_LOGIN_GROUP_DESCRIPTIONS: Record<DemoLoginGroupKey, string> = {
  본사: '본사 어드민 · 전체 매장·디자이너·매출 조회',
  매장: '지역 플랜비 매장 전체 — 펼치면 목록 · 검색 가능',
  디자이너: `데모 · 베타 · 누적 4명(경량) · 증원 20명(매장당 5) — ${DESIGNER_APP_TAB_LABELS} · 검색 후 목록`,
  가입고객: '디자이너 연동 고객 전체(데모·베타·누적·증원) — 펼친 뒤 검색',
};

export const DEMO_LOGIN_COLLAPSIBLE_GROUPS: DemoLoginGroupKey[] = [
  '본사',
  '매장',
  '디자이너',
  '가입고객',
];

export function isCollapsibleDemoLoginGroup(title: DemoLoginGroupKey) {
  return DEMO_LOGIN_COLLAPSIBLE_GROUPS.includes(title);
}

export function isSearchableDemoLoginGroup(title: DemoLoginGroupKey) {
  return title === '매장' || title === '디자이너' || title === '가입고객';
}

export function demoLoginGroupListsAllWhenExpanded(title: DemoLoginGroupKey) {
  return title === '본사' || title === '매장';
}

/** UI 표시용 (무거운 집계 import 없음) */
export const ADMIN_LOGIN_COUNT = 1;
export const STORE_LOGIN_COUNT = 5;
export const DESIGNER_LOGIN_COUNT = INCLUDED_DEMO_TEST_DESIGNER_COUNT;
export const ACCUMULATED_LOGIN_CUSTOMER_COUNT = 5_497;

export function getDemoLoginGroupCountLabel(title: DemoLoginGroupKey | string) {
  const unit = title === '매장' ? '곳' : title === '본사' ? '계정' : '명';
  let count = 0;

  switch (title) {
    case '본사':
      count = ADMIN_LOGIN_COUNT;
      break;
    case '매장':
      count = STORE_LOGIN_COUNT;
      break;
    case '디자이너':
      count = DESIGNER_LOGIN_COUNT;
      break;
    case '가입고객':
      count = ACCUMULATED_LOGIN_CUSTOMER_COUNT;
      break;
    default:
      count = 0;
      break;
  }

  return `${count.toLocaleString('ko-KR')} ${unit}`;
}

export function getDemoLoginSearchPlaceholder(title: DemoLoginGroupKey) {
  if (title === '매장') {
    return '매장명 · 지역 · 상권 · 이메일';
  }

  if (title === '디자이너') {
    return '이름 · 이메일 · 데모/베타/누적/증원 · 매장명';
  }

  if (title === '가입고객') {
    return '이름 · 이메일 · 디자이너 · 데모/베타/누적/증원';
  }

  return '검색';
}
