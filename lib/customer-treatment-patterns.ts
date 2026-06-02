import {
  getTreatmentTemplatesForRegion,
  type TreatmentTemplate,
} from './regional-treatment-pricing';

/**
 * 시술 유형별 단골 재방문 주기 (일) — 국내 미용실 일반 패턴
 * 컷 4~6주, 펌 2~4개월, 염색 3~5개월, 트리트먼트·스파 2~4주 등
 */
export const REVISIT_INTERVAL_DAYS: Record<string, { min: number; max: number }> = {
  컷: { min: 28, max: 42 },
  펌: { min: 60, max: 120 },
  컬러: { min: 90, max: 150 },
  매직: { min: 90, max: 135 },
  트리트먼트: { min: 21, max: 35 },
  스파: { min: 14, max: 28 },
  탈색: { min: 120, max: 180 },
};

/** 단골 재방문 시 동일 시술 유형 유지 비율 */
export const REGULAR_REPEAT_TREATMENT_RATE = 0.6;

/** 신규 고객 유입 — 입점 6개월 / 18개월 / 이후 안정기 */
export function newCustomersQuota(dayIndex: number, monthsElapsed: number) {
  if (monthsElapsed < 6) {
    return dayIndex % 2 === 0 ? 2 : 1;
  }

  if (monthsElapsed < 18) {
    return dayIndex % 4 === 0 ? 1 : 0;
  }

  return dayIndex % 9 === 0 ? 1 : 0;
}

export function hashVisitSeed(...parts: (string | number)[]) {
  let hash = 0;

  for (const part of parts) {
    const text = String(part);

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
  }

  return hash;
}

export function daysUntilNextVisit(customerId: string, visitIndex: number, treatmentType: string) {
  const spec = REVISIT_INTERVAL_DAYS[treatmentType] ?? REVISIT_INTERVAL_DAYS['컷'];
  const span = spec.max - spec.min + 1;
  const offset = hashVisitSeed(customerId, visitIndex, treatmentType) % span;

  return spec.min + offset;
}

export function averageRevisitDaysForType(treatmentType: string) {
  const spec = REVISIT_INTERVAL_DAYS[treatmentType] ?? REVISIT_INTERVAL_DAYS['컷'];

  return (spec.min + spec.max) / 2;
}

/** 지역 시술 비중(템플릿 weight) 반영 가중 평균 재방문 일수 */
export function computeWeightedAverageRevisitDays(templates: TreatmentTemplate[]) {
  const totalWeight = templates.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return 55;
  }

  const weightedSum = templates.reduce(
    (sum, item) => sum + item.weight * averageRevisitDaysForType(item.type),
    0,
  );

  return weightedSum / totalWeight;
}

export function computeWeightedAverageRevisitDaysForRegion(priceRegion = '전국') {
  return computeWeightedAverageRevisitDays(getTreatmentTemplatesForRegion(priceRegion));
}

export function isWeekendDateString(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();

  return day === 0 || day === 6;
}

/** 일일 목표 방문 수 — 주말은 실제 샵처럼 30~40% 가산 (상한 dailyMax+2) */
export function dailyVisitTargetCount(
  dayIndex: number,
  dailyMin: number,
  dailyMax: number,
  date?: string,
) {
  const span = dailyMax - dailyMin + 1;
  const base = dailyMin + (dayIndex % span);

  if (!date || !isWeekendDateString(date)) {
    return base;
  }

  const weekendBoost = Math.max(1, Math.round(span * 0.35));

  return Math.min(dailyMax + 2, base + weekendBoost);
}

export function pickTreatmentTemplateForVisit(
  templates: TreatmentTemplate[],
  options: {
    customerId: string;
    visitCount: number;
    globalSeq: number;
    lastTreatmentType: string | null;
    isRegular: boolean;
  },
): TreatmentTemplate {
  const hash = hashVisitSeed(options.customerId, options.visitCount, options.globalSeq);

  if (options.isRegular && options.lastTreatmentType && hash % 10 < REGULAR_REPEAT_TREATMENT_RATE * 10) {
    const sameType = templates.filter((item) => item.type === options.lastTreatmentType);
    const pool = sameType.length > 0 ? sameType : templates;

    return pool[hash % pool.length] ?? templates[0];
  }

  const totalWeight = templates.reduce((sum, item) => sum + item.weight, 0);
  let pick = hash % totalWeight;

  for (const template of templates) {
    pick -= template.weight;

    if (pick < 0) {
      return template;
    }
  }

  return templates[0] ?? getTreatmentTemplatesForRegion('전국')[0];
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
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

/** 방문주기·신규 유입·지역 시술 비중 기반 가입고객 풀 크기 */
export function estimateCustomerPoolSize(options: {
  historyYears: number;
  dailyMin: number;
  dailyMax: number;
  slotSeed?: number;
  priceRegion?: string;
}): number {
  const { historyYears, dailyMin, dailyMax, slotSeed = 0, priceRegion = '전국' } = options;
  const weightedAvgRevisit = computeWeightedAverageRevisitDaysForRegion(priceRegion);
  const acquisitionCustomers = Math.round(sumAcquisitionSlots(historyYears) * 0.82);
  const avgDaily = (dailyMin + dailyMax) / 2;
  const steadyStateRegulars = Math.round(avgDaily * (weightedAvgRevisit / 7) * 2.75);
  const jitter = slotSeed % 16;
  const raw = acquisitionCustomers + steadyStateRegulars + jitter - 8;
  const floorByTenure: Record<number, number> = { 1: 62, 2: 88, 3: 112, 4: 138, 5: 168 };

  return Math.max(floorByTenure[historyYears] ?? 62, raw);
}
