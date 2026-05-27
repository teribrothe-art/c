#!/usr/bin/env npx tsx
/**
 * 누적 테스트 디자이너 시드 검증 (데모 모드)
 * 실행: npm run verify:accumulated-designer
 */

import {
  ACCUMULATED_TEST_DESIGNERS_PUBLIC,
  ACCUMULATED_TEST_PASSWORD,
} from '../lib/demo-accumulated-test-accounts';
import {
  ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE,
  ACCUMULATED_TEST_PROFILES,
} from '../lib/demo-accumulated-test-seeds';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

type ProfileKey = '2y' | '1y' | '3y';

function verifySlotProfile(
  profileKey: '2y' | '1y',
  minTreatments: number,
) {
  const profile = ACCUMULATED_TEST_PROFILES.find((item) => item.key === profileKey);
  const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[profileKey];
  const publicAccount = ACCUMULATED_TEST_DESIGNERS_PUBLIC.find(
    (item) => item.profileKey === profileKey,
  );

  assert(profile, `${profileKey} 프로필 존재`);
  assert(stats, `${profileKey} 통계 존재`);
  assert(publicAccount, `${profileKey} 공개 계정 존재`);
  assert(profile.customers.length === 10, `${profileKey} 고객 10명`);
  assert(profile.treatments.length === stats.treatmentCount, `${profileKey} 시술 건수 일치`);
  assert(profile.payments.length === stats.paymentCount, `${profileKey} 결제 건수 일치`);
  assert(
    profile.treatments.every((t) => t.designer_id === profile.designer.id),
    `${profileKey} 시술 디자이너 일치`,
  );

  const customerIds = new Set(profile.customers.map((customer) => customer.id));
  assert(
    profile.treatments.every((t) => customerIds.has(t.customer_id)),
    `${profileKey} 시술 고객 ID 일치`,
  );
  assert(
    stats.oldestTreatmentDate !== null &&
      stats.oldestTreatmentDate >= stats.seedStartDate,
    `${profileKey} 시작일 이후 시술`,
  );
  assert(profile.treatments.length >= minTreatments, `${profileKey} 최소 시술 ${minTreatments}건`);

  const perDay = new Map<string, number>();
  for (const treatment of profile.treatments) {
    perDay.set(treatment.treatment_date, (perDay.get(treatment.treatment_date) ?? 0) + 1);
  }

  assert(
    [...perDay.values()].every((count) => count >= profile.dailyMin && count <= profile.dailyMax),
    `${profileKey} 매일 ${profile.dailyMin}~${profile.dailyMax}건`,
  );

  logProfile(publicAccount, stats);
}

function verifyVisitCycleProfile(profileKey: '3y', minTreatments: number) {
  const profile = ACCUMULATED_TEST_PROFILES.find((item) => item.key === profileKey);
  const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[profileKey];
  const publicAccount = ACCUMULATED_TEST_DESIGNERS_PUBLIC.find(
    (item) => item.profileKey === profileKey,
  );

  assert(profile, `${profileKey} 프로필 존재`);
  assert(profile?.visitCycleMode, `${profileKey} visitCycleMode`);
  assert(stats, `${profileKey} 통계 존재`);
  assert(publicAccount, `${profileKey} 공개 계정 존재`);
  assert(profile.customers.length === 150, `${profileKey} 고객 150명`);
  assert(profile.treatments.length === stats.treatmentCount, `${profileKey} 시술 건수 일치`);
  assert(profile.treatments.length >= minTreatments, `${profileKey} 최소 시술 ${minTreatments}건`);

  const perDay = new Map<string, number>();
  for (const treatment of profile.treatments) {
    perDay.set(treatment.treatment_date, (perDay.get(treatment.treatment_date) ?? 0) + 1);
  }

  assert(
    [...perDay.values()].every((count) => count >= profile.dailyMin && count <= profile.dailyMax),
    `${profileKey} 매일 ${profile.dailyMin}~${profile.dailyMax}명`,
  );

  const repeatVisits = new Map<string, number>();
  for (const treatment of profile.treatments) {
    repeatVisits.set(treatment.customer_id, (repeatVisits.get(treatment.customer_id) ?? 0) + 1);
  }

  const regularCustomers = [...repeatVisits.values()].filter((count) => count >= 2).length;
  assert(regularCustomers >= 80, `${profileKey} 단골(2회 이상) 고객 80명 이상`);

  logProfile(publicAccount, stats);
  console.log(`  단골(2회+): ${regularCustomers}명 · 일평균 ${stats.avgDailyTreatments}명`);
}

function logProfile(
  publicAccount: (typeof ACCUMULATED_TEST_DESIGNERS_PUBLIC)[number],
  stats: (typeof ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE)[ProfileKey],
) {
  console.log(`\n=== ${publicAccount.loginLabel} ===`);
  console.log(`  ID: ${publicAccount.id}`);
  console.log(`  이메일: ${publicAccount.email}`);
  console.log(`  비밀번호: ${ACCUMULATED_TEST_PASSWORD}`);
  console.log(`  고객: ${stats.customerCount}명`);
  console.log(`  시술: ${stats.treatmentCount}건`);
  console.log(`  결제: ${stats.paymentCount}건`);
  console.log(`  기간: ${stats.oldestTreatmentDate} ~ ${stats.newestTreatmentDate}`);
  console.log(`  (${stats.yearSpanLabel}) · ${stats.weeklyTreatmentsLabel}`);
}

function main() {
  verifySlotProfile('2y', 700);
  verifySlotProfile('1y', 350);
  verifyVisitCycleProfile('3y', 4000);

  console.log('\n시드 검증 OK');
  console.log('  · 로그인 화면에서 2년 / 1년 / 3년 테스트 디자이너 버튼 확인');
  console.log('  · 3년 계정: 일 4~8명 · 단골 재방문 주기(컷/펌/염색 등)');
  console.log('  · 각 계정은 본인 시드만 메모리 로드 (AsyncStorage 미저장)');
  console.log('\n데이터가 비어 있으면 Expo Go 완전 종료 후 npm run start:phone 으로 재접속');
}

main();
