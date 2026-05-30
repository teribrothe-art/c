#!/usr/bin/env node
/**
 * 전국 600매장 · 1000디자이너 카탈로그 검증
 * 실행: npm run verify:nationwide-catalog
 */

import {
  NATIONWIDE_DESIGNER_COUNT,
  NATIONWIDE_DESIGNER_DEFINITIONS,
  NATIONWIDE_STORE_COUNT,
  NATIONWIDE_STORE_DEFINITIONS,
} from '../lib/nationwide-org-catalog.ts';

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

function run() {
  assert(NATIONWIDE_STORE_COUNT >= 500 && NATIONWIDE_STORE_COUNT <= 700, '매장 수 500~700');
  assert(NATIONWIDE_STORE_DEFINITIONS.length === NATIONWIDE_STORE_COUNT, '매장 정의 수 일치');
  assert(NATIONWIDE_DESIGNER_COUNT === 1000, '디자이너 1000명');
  assert(NATIONWIDE_DESIGNER_DEFINITIONS.length === 1000, '디자이너 정의 수 일치');

  const yearCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const designer of NATIONWIDE_DESIGNER_DEFINITIONS) {
    yearCounts[designer.historyYears] += 1;
    assert(designer.dailyMin === 3 && designer.dailyMax === 7, `${designer.designer.id} 일일 3~7`);
  }

  for (const year of [1, 2, 3, 4]) {
    assert(yearCounts[year] > 0, `${year}년차 디자이너 존재`);
  }

  const designerToStore = new Map();

  const legacyFlagshipIds = new Set([
    'virtual-store-nw-0001',
    'virtual-store-nw-0002',
    'virtual-store-nw-0003',
    'virtual-store-nw-0004',
  ]);

  for (const store of NATIONWIDE_STORE_DEFINITIONS) {
    const isFlagship = legacyFlagshipIds.has(store.id);
    const maxDesigners = isFlagship ? 8 : 4;
    const minDesigners = 1;

    assert(
      store.designerIds.length >= minDesigners && store.designerIds.length <= maxDesigners,
      `${store.name} 디자이너 ${minDesigners}~${maxDesigners} (현재 ${store.designerIds.length})`,
    );

    for (const designerId of store.designerIds) {
      assert(!designerToStore.has(designerId), `중복 배정: ${designerId}`);
      designerToStore.set(designerId, store.id);
    }
  }

  assert(designerToStore.size === 1010, `레거시+전국 디자이너 전체 소속 (현재 ${designerToStore.size})`);

  let nwAssigned = 0;

  for (const designer of NATIONWIDE_DESIGNER_DEFINITIONS) {
    assert(designerToStore.has(designer.designer.id), `${designer.designer.id} 매장 소속`);
    nwAssigned += 1;
  }

  assert(nwAssigned === 1000, '전국 디자이너 1000명 배정');

  const nwPerStore = NATIONWIDE_STORE_DEFINITIONS.map(
    (store) => store.designerIds.filter((id) => id.startsWith('test-designer-nw-')).length,
  );
  const storesWithTwoNw = nwPerStore.filter((count) => count === 2).length;
  const storesWithOneNw = nwPerStore.filter((count) => count === 1).length;

  assert(storesWithTwoNw === 400, `2명 전국 디자이너 매장 400곳 (현재 ${storesWithTwoNw})`);
  assert(storesWithOneNw === 200, `1명 전국 디자이너 매장 200곳 (현재 ${storesWithOneNw})`);

  console.log('verify-nationwide-org-catalog: OK');
  console.log(
    `  매장 ${NATIONWIDE_STORE_COUNT}곳 · 디자이너 ${NATIONWIDE_DESIGNER_COUNT}명 · 연차 ${JSON.stringify(yearCounts)}`,
  );
}

run();
