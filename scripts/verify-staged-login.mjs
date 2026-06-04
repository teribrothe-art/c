#!/usr/bin/env node
/**
 * 테스트 로그인 단계별 목록 검증
 * 실행: npm run verify:staged-login
 */

import {
  NATIONWIDE_DESIGNER_COUNT,
  NATIONWIDE_DESIGNER_DEFINITIONS,
  NATIONWIDE_REGISTERED_CUSTOMER_TOTAL,
} from '../lib/nationwide-org-catalog.ts';
import {
  DEMO_LOGIN_PAGE_SIZE,
  DESIGNER_LIST_STAGE_TABS,
  paginateList,
} from '../lib/demo-login-list-staging.ts';

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const CONSONANT_TABS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const DOUBLE_TO_SINGLE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

function getInitialConsonant(label) {
  for (const char of label.trim()) {
    const code = char.charCodeAt(0);

    if (code >= 0xac00 && code <= 0xd7a3) {
      const initial = CHO[Math.floor((code - 0xac00) / 588)] ?? 'ㅇ';
      return DOUBLE_TO_SINGLE[initial] ?? initial;
    }
  }

  return 'ㅇ';
}

function countNationwideCustomersByConsonant() {
  const counts = Object.fromEntries(CONSONANT_TABS.map((tab) => [tab, 0]));

  for (const designer of NATIONWIDE_DESIGNER_DEFINITIONS) {
    for (const customer of designer.customers) {
      const tab = getInitialConsonant(customer.name ?? customer.email);
      counts[tab] = (counts[tab] ?? 0) + 1;
    }
  }

  return counts;
}

function run() {
  assert(DESIGNER_LIST_STAGE_TABS.includes('전체보기'), '전체보기 탭 존재');
  assert(DEMO_LOGIN_PAGE_SIZE > 0, '페이지 크기');

  const totalCustomers = NATIONWIDE_DESIGNER_DEFINITIONS.reduce(
    (sum, designer) => sum + designer.customers.length,
    0,
  );

  assert(
    totalCustomers === NATIONWIDE_REGISTERED_CUSTOMER_TOTAL,
    `전국 가입고객 ${totalCustomers} !== ${NATIONWIDE_REGISTERED_CUSTOMER_TOTAL}`,
  );

  const consonantCounts = countNationwideCustomersByConsonant();
  const consonantSum = Object.values(consonantCounts).reduce((sum, count) => sum + count, 0);

  assert(consonantSum === NATIONWIDE_REGISTERED_CUSTOMER_TOTAL, '전국 초성 합');

  const nationwidePage0 = paginateList(
    Array.from({ length: NATIONWIDE_DESIGNER_COUNT }, (_, index) => index),
    0,
    DEMO_LOGIN_PAGE_SIZE,
  );

  assert(nationwidePage0.slice.length === DEMO_LOGIN_PAGE_SIZE, '전국 1페이지');
  assert(nationwidePage0.hasMore, '전국 hasMore');

  const lastPageIndex = Math.ceil(NATIONWIDE_DESIGNER_COUNT / DEMO_LOGIN_PAGE_SIZE) - 1;
  const nationwideLastPage = paginateList(
    Array.from({ length: NATIONWIDE_DESIGNER_COUNT }, (_, index) => index),
    lastPageIndex,
    DEMO_LOGIN_PAGE_SIZE,
  );

  assert(nationwideLastPage.slice.length > 0, '전국 마지막 페이지');
  assert(!nationwideLastPage.hasMore, '전국 마지막 페이지 hasMore=false');

  console.log('verify-staged-login: OK');
  console.log(
    `  전국 가입고객 ${NATIONWIDE_REGISTERED_CUSTOMER_TOTAL.toLocaleString('ko-KR')}명 · 디자이너 ${NATIONWIDE_DESIGNER_COUNT}명 · 페이지 ${DEMO_LOGIN_PAGE_SIZE}명`,
  );
}

run();
