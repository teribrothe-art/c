import type { PaymentStatus } from './payment-status';
import { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-record';
import type { PaymentRecord } from './payment-types';
import type { BetaTestAccount } from './beta-test-accounts';
import {
  type AccumulatedDemoTreatment,
  type AccumulatedSeedProfileConfig,
  type BuiltAccumulatedSeedProfile,
} from './demo-accumulated-seed-builder';

/** 시술 유형별 단골 재방문 주기 (일) */
const REVISIT_INTERVAL_DAYS: Record<string, { min: number; max: number }> = {
  컷: { min: 28, max: 42 },
  펌: { min: 60, max: 120 },
  컬러: { min: 90, max: 150 },
  매직: { min: 90, max: 135 },
  트리트먼트: { min: 21, max: 35 },
  탈색: { min: 120, max: 180 },
};

const TREATMENT_TEMPLATES = [
  { type: '컷', title: '레이어드 컷', price: 120000, duration: '1시간 20분', weight: 28 },
  { type: '컬러', title: '애쉬브라운 컬러', price: 180000, duration: '2시간 30분', weight: 18 },
  { type: '펌', title: '볼륨 디지털 펌', price: 220000, duration: '3시간', weight: 14 },
  { type: '매직', title: '매직스트레이트', price: 280000, duration: '4시간', weight: 10 },
  { type: '트리트먼트', title: '단백질 딥 케어', price: 90000, duration: '1시간', weight: 16 },
  { type: '탈색', title: '탈색 + 톤다운', price: 260000, duration: '3시간 40분', weight: 8 },
] as const;

type TreatmentTemplate = (typeof TREATMENT_TEMPLATES)[number];

type CustomerVisitState = {
  customer: BetaTestAccount;
  customerIndex: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  lastTemplate: TreatmentTemplate | null;
  nextDueDate: string | null;
  visitCount: number;
  isRegular: boolean;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function getSeedStartDate(historyYears: number, reference = new Date()) {
  const start = new Date(reference);
  start.setFullYear(start.getFullYear() - historyYears);
  start.setHours(12, 0, 0, 0);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoAt(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function hashSeed(...parts: (string | number)[]) {
  let hash = 0;

  for (const part of parts) {
    const text = String(part);

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
  }

  return hash;
}

function pickTemplateForVisit(state: CustomerVisitState, globalSeq: number): TreatmentTemplate {
  const hash = hashSeed(state.customer.id, state.visitCount, globalSeq);

  if (state.isRegular && state.lastTemplate && hash % 10 < 6) {
    const sameType = TREATMENT_TEMPLATES.filter((item) => item.type === state.lastTemplate?.type);
    const pool = sameType.length > 0 ? sameType : TREATMENT_TEMPLATES;
    return pool[hash % pool.length];
  }

  const totalWeight = TREATMENT_TEMPLATES.reduce((sum, item) => sum + item.weight, 0);
  let pick = hash % totalWeight;

  for (const template of TREATMENT_TEMPLATES) {
    pick -= template.weight;

    if (pick < 0) {
      return template;
    }
  }

  return TREATMENT_TEMPLATES[0];
}

function daysUntilNextVisit(customerId: string, visitIndex: number, treatmentType: string) {
  const spec = REVISIT_INTERVAL_DAYS[treatmentType] ?? REVISIT_INTERVAL_DAYS['컷'];
  const span = spec.max - spec.min + 1;
  const offset = hashSeed(customerId, visitIndex, treatmentType) % span;

  return spec.min + offset;
}

function resolvePaymentStatus(
  date: string,
  treatmentSeq: number,
  customerIndex: number,
): PaymentStatus {
  const visitDateObj = new Date(`${date}T12:00:00`);
  const monthsAgo = monthsBetween(visitDateObj, new Date());

  if (monthsAgo <= 1 && customerIndex % 5 === 0 && treatmentSeq % 11 === 0) {
    return 'payment_requested';
  }

  if (monthsAgo <= 2 && customerIndex % 4 === 1 && treatmentSeq % 13 === 0) {
    return 'escrow';
  }

  return 'completed';
}

function dailyVisitCount(dayIndex: number, dailyMin: number, dailyMax: number) {
  const span = dailyMax - dailyMin + 1;
  return dailyMin + (dayIndex % span);
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

function visitPriority(state: CustomerVisitState, today: string) {
  if (!state.isRegular) {
    return `0-${String(state.customerIndex).padStart(4, '0')}`;
  }

  const due = state.nextDueDate ?? '9999-12-31';

  if (due <= today) {
    const overdueDays = Math.max(
      0,
      Math.floor(
        (new Date(`${today}T12:00:00`).getTime() - new Date(`${due}T12:00:00`).getTime()) /
          86400000,
      ),
    );

    return `1-${String(999 - Math.min(overdueDays, 999)).padStart(3, '0')}-${due}`;
  }

  return `2-${due}`;
}

function sortByVisitPriority(states: CustomerVisitState[], today: string) {
  return [...states].sort((a, b) => visitPriority(a, today).localeCompare(visitPriority(b, today)));
}

function computeSeedWorkloadStats(treatments: AccumulatedDemoTreatment[], dailyLabel: string) {
  const perDay = new Map<string, number>();

  for (const treatment of treatments) {
    perDay.set(treatment.treatment_date, (perDay.get(treatment.treatment_date) ?? 0) + 1);
  }

  const dailyCounts = [...perDay.values()];
  const avgDaily =
    dailyCounts.length > 0
      ? dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length
      : 0;

  return {
    activeDays: dailyCounts.length,
    avgDailyTreatments: Math.round(avgDaily * 10) / 10,
    minDailyTreatments: dailyCounts.length > 0 ? Math.min(...dailyCounts) : 0,
    maxDailyTreatments: dailyCounts.length > 0 ? Math.max(...dailyCounts) : 0,
    weeklyTreatmentsLabel: dailyLabel,
  };
}

function appendVisit(
  config: AccumulatedSeedProfileConfig,
  treatmentDate: string,
  state: CustomerVisitState,
  treatmentSeq: number,
  slotInDay: number,
  treatments: AccumulatedDemoTreatment[],
  payments: PaymentRecord[],
) {
  const template = pickTemplateForVisit(state, treatmentSeq);
  const paymentStatus = resolvePaymentStatus(treatmentDate, treatmentSeq, state.customerIndex);
  const treatmentId = `${config.treatmentIdPrefix}${String(treatmentSeq + 1).padStart(5, '0')}`;
  const price = template.price + (hashSeed(state.customer.id, treatmentSeq) % 4) * 10000;
  const fees = calculatePaymentFees(price);
  const hour = 9 + ((treatmentSeq + slotInDay) % 9);
  const paidAt = isoAt(treatmentDate, hour);
  const settledAt = isoAt(treatmentDate, Math.max(8, hour - 1));

  const treatment: AccumulatedDemoTreatment = {
    id: treatmentId,
    customer_id: state.customer.id,
    designer_id: config.designer.id,
    designer_name: config.designer.name ?? '디자이너',
    customer_name: state.customer.name ?? '고객',
    treatment_date: treatmentDate,
    treatment_type: template.type,
    treatment_title: template.title,
    products: ['로레알'],
    damage_level: 3 + (hashSeed(state.customer.id, treatmentSeq) % 5),
    duration: template.duration,
    technique: template.type,
    designer_diagnosis: `${state.customer.name} ${template.type}`,
    home_care: '정기 케어 권장',
    ai_insight: '홈케어 유지',
    price,
    payment_status: paymentStatus,
    feedback_completed: paymentStatus === 'completed' || paymentStatus === 'escrow',
    created_at: paidAt,
  };

  if (paymentStatus === 'payment_requested') {
    treatment.payment_requested_at = paidAt;
    treatments.push(treatment);
  }

  if (paymentStatus !== 'payment_requested') {
    treatment.paid_at = paidAt;
    treatment.platform_fee = fees.feeAmount;
    treatment.designer_payout_amount = fees.designerPayout;

    if (paymentStatus === 'completed') {
      treatment.settled_at = settledAt;
    }

    treatments.push(treatment);

    payments.push({
      id: `${config.paymentIdPrefix}${treatmentId}`,
      treatment_id: treatmentId,
      customer_id: state.customer.id,
      designer_id: config.designer.id,
      amount: price,
      fee_rate: PLATFORM_FEE_RATE,
      fee_amount: fees.feeAmount,
      designer_payout: fees.designerPayout,
      status: paymentStatus === 'completed' ? 'completed' : 'paid',
      toss_payment_key: `accum_key_${treatmentId}`,
      toss_order_id: `hair-${treatmentId}`,
      paid_at: paidAt,
      settled_at: paymentStatus === 'completed' ? settledAt : null,
      created_at: paidAt,
      receipt_url: `https://dashboard.tosspayments.com/receipt/payment/${treatmentId}`,
      refund_amount: 0,
      refund_reason: null,
      refunded_at: null,
    });
  }

  const revisitDays = daysUntilNextVisit(
    state.customer.id,
    state.visitCount + 1,
    template.type,
  );
  const nextDue = addDays(new Date(`${treatmentDate}T12:00:00`), revisitDays);

  state.firstVisitDate = state.firstVisitDate ?? treatmentDate;
  state.lastVisitDate = treatmentDate;
  state.lastTemplate = template;
  state.nextDueDate = formatDate(nextDue);
  state.visitCount += 1;
  state.isRegular = true;
}

export function buildVisitCycleAccumulatedSeedProfile(
  config: AccumulatedSeedProfileConfig,
): BuiltAccumulatedSeedProfile {
  const seedStartDate = getSeedStartDate(config.historyYears);
  const endDate = new Date();
  const treatments: AccumulatedDemoTreatment[] = [];
  const payments: PaymentRecord[] = [];

  const states: CustomerVisitState[] = config.customers.map((customer, customerIndex) => ({
    customer,
    customerIndex,
    firstVisitDate: null,
    lastVisitDate: null,
    lastTemplate: null,
    nextDueDate: null,
    visitCount: 0,
    isRegular: false,
  }));

  const inactiveQueue = [...states];
  let treatmentSeq = 0;
  let dayIndex = 0;

  for (let day = new Date(seedStartDate); day.getTime() <= endDate.getTime(); day = addDays(day, 1)) {
    const today = formatDate(day);
    const targetCount = dailyVisitCount(dayIndex, config.dailyMin, config.dailyMax);
    const monthsElapsed = monthsBetween(seedStartDate, day);
    const scheduled: CustomerVisitState[] = [];
    const usedToday = new Set<string>();

    const scheduleCustomer = (state: CustomerVisitState) => {
      if (usedToday.has(state.customer.id)) {
        return false;
      }

      scheduled.push(state);
      usedToday.add(state.customer.id);
      return true;
    };

    for (const state of sortByVisitPriority(
      states.filter((item) => item.isRegular && item.nextDueDate && item.nextDueDate <= today),
      today,
    )) {
      if (scheduled.length >= targetCount) {
        break;
      }

      scheduleCustomer(state);
    }

    let newQuota = newCustomersQuota(dayIndex, monthsElapsed);

    while (newQuota > 0 && scheduled.length < targetCount && inactiveQueue.length > 0) {
      const state = inactiveQueue.shift();

      if (!state) {
        newQuota -= 1;
        continue;
      }

      if (scheduleCustomer(state)) {
        newQuota -= 1;
      }
    }

    for (const state of sortByVisitPriority(
      states.filter((item) => !usedToday.has(item.customer.id)),
      today,
    )) {
      if (scheduled.length >= targetCount) {
        break;
      }

      scheduleCustomer(state);
    }

    scheduled.forEach((state, slotInDay) => {
      appendVisit(config, today, state, treatmentSeq, slotInDay, treatments, payments);
      treatmentSeq += 1;
    });

    dayIndex += 1;
  }

  treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));

  const regularCount = states.filter((state) => state.isRegular).length;
  const dailyLabel = `일 ${config.dailyMin}~${config.dailyMax}명 · 단골 ${regularCount}명 · 재방문 주기 반영`;
  const workloadStats = computeSeedWorkloadStats(treatments, dailyLabel);

  return {
    ...config,
    treatments,
    payments,
    stats: {
      profileKey: config.key,
      designerId: config.designer.id,
      designerName: config.designer.name ?? '디자이너',
      customerCount: config.customers.length,
      treatmentCount: treatments.length,
      paymentCount: payments.length,
      seedStartDate: formatDate(seedStartDate),
      yearSpanLabel: `${seedStartDate.getFullYear()}~현재`,
      oldestTreatmentDate: treatments.at(-1)?.treatment_date ?? null,
      newestTreatmentDate: treatments[0]?.treatment_date ?? null,
      ...workloadStats,
    },
  };
}
