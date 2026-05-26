#!/usr/bin/env npx tsx
/**
 * 3년 누적 테스트 디자이너 시드 검증 (데모 모드)
 * 실행: npm run verify:accumulated-designer
 */

import {
  ACCUMULATED_TEST_CUSTOMERS,
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_PUBLIC,
} from '../lib/demo-accumulated-test-accounts';
import {
  ACCUMULATED_DEMO_PAYMENTS,
  ACCUMULATED_DEMO_SEED_STATS,
  ACCUMULATED_DEMO_TREATMENTS,
} from '../lib/demo-accumulated-test-seeds';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const designerId = ACCUMULATED_TEST_DESIGNER.id;

  assert(ACCUMULATED_TEST_CUSTOMERS.length === 10, '고객 10명 시드');
  assert(
    ACCUMULATED_DEMO_TREATMENTS.length === ACCUMULATED_DEMO_SEED_STATS.treatmentCount,
    '시술 건수 통계 일치',
  );
  assert(
    ACCUMULATED_DEMO_PAYMENTS.length === ACCUMULATED_DEMO_SEED_STATS.paymentCount,
    '결제 건수 통계 일치',
  );
  assert(
    ACCUMULATED_DEMO_TREATMENTS.every((t) => t.designer_id === designerId),
    '모든 시술이 누적 테스트 디자이너 소속',
  );

  const customerIds = new Set(ACCUMULATED_TEST_CUSTOMERS.map((c) => c.id));
  assert(
    ACCUMULATED_DEMO_TREATMENTS.every((t) => customerIds.has(t.customer_id)),
    '시술 고객 ID가 테스트 고객 10명 중 하나',
  );

  assert(
    ACCUMULATED_DEMO_SEED_STATS.oldestTreatmentDate !== null &&
      ACCUMULATED_DEMO_SEED_STATS.oldestTreatmentDate >= '2023-05-01',
    '가장 오래된 시술이 2023년대',
  );
  assert(
    ACCUMULATED_DEMO_TREATMENTS.length >= 950 && ACCUMULATED_DEMO_TREATMENTS.length <= 1050,
    '시술 약 1,000건 시드',
  );

  console.log('=== 3년 누적 테스트 디자이너 ===\n');
  console.log('로그인 (데모 모드 · Supabase 미설정)');
  console.log(`  ID: ${ACCUMULATED_TEST_DESIGNER_PUBLIC.id}`);
  console.log(`  이메일: ${ACCUMULATED_TEST_DESIGNER_PUBLIC.email}`);
  console.log(`  비밀번호: ${ACCUMULATED_TEST_DESIGNER_PUBLIC.password}\n`);

  console.log('시드 검증 OK');
  console.log(`  고객: ${ACCUMULATED_DEMO_SEED_STATS.customerCount}명`);
  console.log(`  시술: ${ACCUMULATED_DEMO_SEED_STATS.treatmentCount}건`);
  console.log(`  결제: ${ACCUMULATED_DEMO_SEED_STATS.paymentCount}건`);
  console.log(
    `  기간: ${ACCUMULATED_DEMO_SEED_STATS.oldestTreatmentDate} ~ ${ACCUMULATED_DEMO_SEED_STATS.newestTreatmentDate}`,
  );
  console.log(`  (${ACCUMULATED_DEMO_SEED_STATS.yearSpanLabel})`);
  console.log(`  패턴: ${ACCUMULATED_DEMO_SEED_STATS.weeklyTreatmentsLabel}`);
  console.log(`  영업일 평균: ${ACCUMULATED_DEMO_SEED_STATS.avgDailyTreatments}건/일\n`);

  console.log('앱에서 확인할 화면');
  console.log('  1. 로그인 → 「3년 누적 테스트 디자이너 로그인」 버튼');
  console.log('  2. 마이 → 내 활동 (누적·월별 정산)');
  console.log('  3. 고객 탭 (10명·시술 목록)');
  console.log('  4. 매출 탭 (월별 차트)');
  console.log('  5. 시술 상세 → 결제·정산 상태\n');

  console.log('데이터가 비어 있으면 Expo Go 완전 종료 후 npm run start:phone 으로 재접속');
}

main();
