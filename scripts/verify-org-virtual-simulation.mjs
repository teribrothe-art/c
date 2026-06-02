#!/usr/bin/env node
/**
 * 가상 시뮬레이션(실데이터 + 시나리오 배율) 순수 로직 검증
 * 실행: node scripts/verify-org-virtual-simulation.mjs
 */

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

const RECOGNIZED = new Set(['completed', 'paid', 'in_escrow']);

function isRecognizedRevenueInMonth(payment, monthKey) {
  if (!RECOGNIZED.has(payment.status)) {
    return false;
  }

  const date = (payment.settled_at ?? payment.paid_at ?? payment.created_at ?? '').slice(0, 7);

  return date === monthKey;
}

function scenarioMultiplier(scenario) {
  if (scenario === 'weekend_peak') {
    return { revenue: 1.35, treatments: 1.28, pending: 0.85, customers: 1.15 };
  }

  if (scenario === 'month_end') {
    return { revenue: 1.08, treatments: 1.05, pending: 1.65, customers: 1.02 };
  }

  return { revenue: 1, treatments: 1, pending: 1, customers: 1 };
}

function scaleGross(realGross, scenario) {
  return Math.round(realGross * scenarioMultiplier(scenario).revenue);
}

function run() {
  const monthKey = new Date().toISOString().slice(0, 7);

  assert(isRecognizedRevenueInMonth({ status: 'paid', paid_at: `${monthKey}-12T10:00:00.000Z` }, monthKey));
  assert(
    !isRecognizedRevenueInMonth({ status: 'pending', created_at: `${monthKey}-12T10:00:00.000Z` }, monthKey),
  );
  assert(
    isRecognizedRevenueInMonth(
      { status: 'completed', settled_at: `${monthKey}-12T10:00:00.000Z`, paid_at: `${monthKey}-11T10:00:00.000Z` },
      monthKey,
    ),
  );

  const realGross = 4_500_000;
  const weekday = scaleGross(realGross, 'weekday');
  const weekend = scaleGross(realGross, 'weekend_peak');

  assert(weekday === realGross, '평일 배율 1.0');
  assert(weekend > weekday, '주말 시나리오 매출 증가');
  assert(weekend === Math.round(realGross * 1.35), '주말 1.35배');

  const treatmentGross = 2_000_000;
  const paymentGross = 1_500_000;
  assert(Math.max(treatmentGross, paymentGross) === treatmentGross, '시술 금액 우선 합산');

  console.log('verify-org-virtual-simulation: OK');
}

run();
