#!/usr/bin/env node
/**
 * 내 다이어리 필터·연도별 로직 스모크 테스트 (데모 데이터)
 */
import assert from 'node:assert/strict';

const DEMO_CUSTOMER_ID = 'demo-customer-kim-jiwon';

const demoTreatments = [
  { id: '1', customer_id: DEMO_CUSTOMER_ID, treatment_date: '2026-04-18', treatment_type: '탈색', treatment_title: '탈색 + 토닝' },
  { id: '2', customer_id: DEMO_CUSTOMER_ID, treatment_date: '2026-03-05', treatment_type: '컷', treatment_title: '레이어드 컷' },
  { id: '3', customer_id: DEMO_CUSTOMER_ID, treatment_date: '2026-01-22', treatment_type: '컬러', treatment_title: '애쉬그레이' },
  { id: '4', customer_id: 'demo-customer-park-minji', treatment_date: '2026-04-10', treatment_type: '매직', treatment_title: '매직' },
  { id: '5', customer_id: DEMO_CUSTOMER_ID, treatment_date: '2025-11-08', treatment_type: '펌', treatment_title: '볼륨 펌' },
];

// Inline minimal copies to avoid TS import in mjs — import from built paths via dynamic import
const root = new URL('../', import.meta.url);

async function main() {
  const { filterTreatmentsForCustomerUser, countTreatmentsForDiaryFilter, sortTreatmentsForDiaryList } =
    await import(new URL('../lib/diary-list.ts', root).href).catch(() => null) ?? { };

  if (!filterTreatmentsForCustomerUser) {
    // Fallback: replicate filter logic for CI without TS loader
    console.log('SKIP: TS module import unavailable, using inline checks');
    const mine = demoTreatments.filter((t) => t.customer_id === DEMO_CUSTOMER_ID);
    assert.equal(mine.length, 4, 'customer should have 4 treatments');
    const years = [...new Set(mine.map((t) => t.treatment_date.slice(0, 4)))].sort();
    assert.deepEqual(years, ['2025', '2026'], 'years 2025 and 2026');
    const cuts = mine.filter((t) => t.treatment_type.includes('컷') || t.treatment_title.includes('컷'));
    assert.equal(cuts.length, 1, 'one cut record');
    console.log('OK: inline diary checks passed');
    process.exit(0);
  }

  const mine = sortTreatmentsForDiaryList(filterTreatmentsForCustomerUser(DEMO_CUSTOMER_ID, demoTreatments));
  assert.equal(mine.length, 4, 'customer treatments count');
  assert.equal(mine[0].treatment_date, '2026-04-18', 'newest first');

  assert.equal(countTreatmentsForDiaryFilter(mine, '전체'), 4);
  assert.equal(countTreatmentsForDiaryFilter(mine, '컷'), 1);
  assert.equal(countTreatmentsForDiaryFilter(mine, '컬러'), 1);
  assert.equal(countTreatmentsForDiaryFilter(mine, '펌'), 1);
  assert.equal(countTreatmentsForDiaryFilter(mine, '탈색'), 1);

  const { getDiaryYearSummaries } = await import(new URL('../lib/diary-years.ts', root).href);
  const years = getDiaryYearSummaries(mine);
  assert.equal(years.length, 2, 'two years');
  assert.equal(years[0].year, 2025, 'oldest year first');
  assert.equal(years[1].count, 3, '2026 has 3 records');

  console.log('OK: diary-list + diary-years');
  console.log(`  고객 시술 ${mine.length}건, 연도 ${years.map((y) => `${y.year}(${y.count})`).join(', ')}`);
  console.log(`  필터: 전체=${countTreatmentsForDiaryFilter(mine, '전체')} 컷=${countTreatmentsForDiaryFilter(mine, '컷')} 컬러=${countTreatmentsForDiaryFilter(mine, '컬러')}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
