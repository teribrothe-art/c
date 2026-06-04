import { BETA_CUSTOMERS } from './beta-test-accounts';
import { EXPANDED_DESIGNERS_PER_STORE } from './demo-expanded-store-designers';

const DEMO_LINKED_STATIC = 4;

const ACCUMULATED_POOL_CUSTOMER_COUNTS = {
  y1: 80,
  y2: 120,
  y3: 150,
  y5: 200,
} as const;

function hashDesignerSlot(slot: number, salt: number) {
  return ((slot * 1_103 + salt * 97 + 17) % 10_007) >>> 0;
}

const EXPANDED_HISTORY_YEAR_PATTERN: (1 | 2)[] = [
  1, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1,
];

function resolveExpandedHistoryYears(slot: number): 1 | 2 {
  return EXPANDED_HISTORY_YEAR_PATTERN[slot - 1] ?? (((slot % 2) + 1) as 1 | 2);
}

function customerCountForExpandedSlot(slot: number, historyYears: 1 | 2) {
  const hash = hashDesignerSlot(slot, 7);

  if (historyYears === 1) {
    return 28 + (hash % 15);
  }

  return 36 + (hash % 18);
}

/** 증원 디자이너 연동 고객 수 — 배열 생성 없이 합산 */
export function getExpandedLinkedCustomerCount() {
  let slot = 0;
  let total = 0;

  for (const { count } of EXPANDED_DESIGNERS_PER_STORE) {
    for (let index = 0; index < count; index += 1) {
      slot += 1;
      total += customerCountForExpandedSlot(slot, resolveExpandedHistoryYears(slot));
    }
  }

  return total;
}

export const EXPANDED_LINKED_CUSTOMER_COUNT = getExpandedLinkedCustomerCount();

export const ACCUMULATED_LINKED_CUSTOMER_COUNT =
  ACCUMULATED_POOL_CUSTOMER_COUNTS.y1 +
  ACCUMULATED_POOL_CUSTOMER_COUNTS.y2 +
  ACCUMULATED_POOL_CUSTOMER_COUNTS.y3 +
  ACCUMULATED_POOL_CUSTOMER_COUNTS.y5;

/** 테스트 로그인 · 가입고객 탭 인원 (배열 생성 없음) */
export const DESIGNER_LINKED_CUSTOMER_COUNT =
  DEMO_LINKED_STATIC + BETA_CUSTOMERS.length + ACCUMULATED_LINKED_CUSTOMER_COUNT + EXPANDED_LINKED_CUSTOMER_COUNT;

export const DESIGNER_LOGIN_COUNT_STATIC = 1 + 5 + 4 + 15;
