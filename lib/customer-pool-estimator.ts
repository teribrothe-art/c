/**
 * 방문주기·신규 유입 패턴 기반 가입고객 풀 크기 (독립 모듈 — 카탈로그 검증용)
 */

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function newCustomersQuota(dayIndex: number, monthsElapsed: number) {
  if (monthsElapsed < 6) {
    return dayIndex % 2 === 0 ? 2 : 1;
  }

  if (monthsElapsed < 18) {
    return dayIndex % 4 === 0 ? 1 : 0;
  }

  return dayIndex % 9 === 0 ? 1 : 0;
}

function sumAcquisitionSlots(historyYears: number) {
  const start = new Date();
  start.setFullYear(start.getFullYear() - historyYears);
  start.setHours(12, 0, 0, 0);

  const end = new Date();
  end.setHours(12, 0, 0, 0);

  let slots = 0;
  let dayIndex = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    slots += newCustomersQuota(dayIndex, monthsBetween(start, cursor));
    dayIndex += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

const WEIGHTED_AVG_REVISIT_DAYS = 55;

export function estimateCustomerPoolSize(options: {
  historyYears: number;
  dailyMin: number;
  dailyMax: number;
  slotSeed?: number;
}): number {
  const { historyYears, dailyMin, dailyMax, slotSeed = 0 } = options;
  const acquisitionCustomers = Math.round(sumAcquisitionSlots(historyYears) * 0.82);
  const avgDaily = (dailyMin + dailyMax) / 2;
  const steadyStateRegulars = Math.round(avgDaily * (WEIGHTED_AVG_REVISIT_DAYS / 7) * 2.75);
  const jitter = slotSeed % 16;
  const raw = acquisitionCustomers + steadyStateRegulars + jitter - 8;
  const floorByTenure: Record<number, number> = { 1: 62, 2: 88, 3: 112, 4: 138, 5: 168 };

  return Math.max(floorByTenure[historyYears] ?? 62, raw);
}
