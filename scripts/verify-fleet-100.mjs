#!/usr/bin/env node
/**
 * 증원 디자이너 시드 메타 규칙 검증 (TS 런타임 없이 구조·수식 확인)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const fleetSrc = readFileSync(new URL('lib/demo-fleet-100-designers.ts', root), 'utf8');
const visitSrc = readFileSync(new URL('lib/demo-accumulated-visit-seed-builder.ts', root), 'utf8');
const accountsSrc = readFileSync(new URL('lib/demo-accumulated-test-accounts.ts', root), 'utf8');

const FLEET_HISTORY_YEARS = [1, 3, 5, 7, 10];
const PER_STORE = 5;
const STORE_COUNT = 4;
const FLEET_COUNT = PER_STORE * STORE_COUNT;

assert.match(fleetSrc, /export const FLEET_DESIGNERS_PER_STORE_COUNT = 5/);
assert.match(fleetSrc, /FLEET_HISTORY_YEARS = \[1, 3, 5, 7, 10\]/);
assert.match(fleetSrc, /weeklyNewCustomers: 1/);
assert.match(fleetSrc, /visitCycleMode: true/);
assert.match(fleetSrc, /52 \* historyYears/);
assert.match(fleetSrc, /dailyMin = 3/);
assert.match(fleetSrc, /dailyMax = 10/);
assert.equal(
  (fleetSrc.match(/count: FLEET_DESIGNERS_PER_STORE_COUNT/g) ?? []).length,
  STORE_COUNT,
  '4개 매장 × 5명',
);
assert.match(fleetSrc, /FLEET_100_DESIGNER_DEFINITIONS/);

assert.match(visitSrc, /weeklyNewCustomers === 1/);
assert.match(visitSrc, /dayIndex % 7 === 0 \? 1 : 0/);
assert.match(visitSrc, /REVISIT_INTERVAL_DAYS/);

assert.match(accountsSrc, /FLEET_100_PROFILE_CONFIGS/);
assert.match(accountsSrc, /FLEET_100_DESIGNERS_PUBLIC/);

function resolveFleetHistoryYears(slot) {
  return FLEET_HISTORY_YEARS[(slot - 1) % FLEET_HISTORY_YEARS.length];
}

let totalCustomers = 0;

for (let slot = 1; slot <= FLEET_COUNT; slot += 1) {
  const years = resolveFleetHistoryYears(slot);
  assert.ok(FLEET_HISTORY_YEARS.includes(years));
  totalCustomers += 52 * years;
}

const perStoreCustomers = FLEET_HISTORY_YEARS.reduce((sum, years) => sum + 52 * years, 0);

assert.equal(totalCustomers, perStoreCustomers * STORE_COUNT, '매장당 5명 × 4매장 고객 메타');

console.log(
  `✅ verify-fleet-100: ${FLEET_COUNT}명 · 1·3·5·7·10년차 · 주1신규 · 일3~10 · 재방문주기 · 매장${PER_STORE}명`,
);
console.log(`   연동 고객 메타 합계(증원): ${totalCustomers.toLocaleString('ko-KR')}명`);
