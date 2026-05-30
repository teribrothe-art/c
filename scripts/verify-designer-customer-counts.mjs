#!/usr/bin/env node
/**
 * 디자이너 테스트 계정 고객수 검증 (순수 JS — RN 의존 없음)
 * 실행: node scripts/verify-designer-customer-counts.mjs
 */

const DEMO_DESIGNER_CUSTOMER_COUNT = 4;
const BETA_DESIGNER_CUSTOMER_COUNT = 1;

const ACCUMULATED_POOL_COUNTS = {
  'test-designer-1y': 80,
  'test-designer-3y': 120,
  'test-designer-accum-3y': 150,
  'test-designer-accum-5y': 200,
};

const EXPANDED_HISTORY_YEAR_PATTERN = [1, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1];

function hashDesignerSlot(slot, salt) {
  return ((slot * 1103 + salt * 97 + 17) % 10007) >>> 0;
}

function customerCountForTier(slot, historyYears) {
  const hash = hashDesignerSlot(slot, 7);

  if (historyYears === 1) {
    return 28 + (hash % 15);
  }

  return 36 + (hash % 18);
}

function expandedDesignerCounts() {
  const counts = [];

  for (let slot = 1; slot <= 15; slot += 1) {
    const historyYears = EXPANDED_HISTORY_YEAR_PATTERN[slot - 1] ?? ((slot % 2) + 1);
    counts.push({
      id: `test-designer-exp-${String(slot).padStart(2, '0')}`,
      count: customerCountForTier(slot, historyYears),
    });
  }

  return counts;
}

function main() {
  const expected = new Map([
    ['demo-designer-local', DEMO_DESIGNER_CUSTOMER_COUNT],
    ...Array.from({ length: 5 }, (_, index) => [
      `beta-designer-${String(index + 1).padStart(2, '0')}`,
      BETA_DESIGNER_CUSTOMER_COUNT,
    ]),
    ...Object.entries(ACCUMULATED_POOL_COUNTS),
    ...expandedDesignerCounts().map((item) => [item.id, item.count]),
  ]);

  console.log('Expected designer customer counts (linked pool):');
  for (const [id, count] of expected) {
    console.log(`  ${id}: ${count}명`);
  }

  console.log(`\nTotal designers: ${expected.size}`);
  console.log(
    `Total linked customers: ${[...expected.values()].reduce((sum, count) => sum + count, 0)}명`,
  );
  console.log('\nRun the app test-login screen to confirm displayed counts match these values.');
}

main();
