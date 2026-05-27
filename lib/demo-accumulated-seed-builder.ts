import type { PaymentStatus } from './payment-status';
import { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-fees';
import type { PaymentRecord } from './payment-types';
import type { BetaTestAccount } from './beta-test-accounts';

/** treatments.ts Treatment 과 동일한 시드 형태 (순환 import 방지) */
export type AccumulatedDemoTreatment = {
  id: string;
  customer_id: string;
  designer_id: string;
  designer_name: string;
  customer_name: string;
  treatment_date: string;
  treatment_type: string;
  treatment_title: string;
  products: string[];
  damage_level: number;
  duration: string;
  technique?: string | null;
  designer_diagnosis: string;
  home_care: string;
  ai_insight: string;
  price: number;
  payment_status: PaymentStatus;
  feedback_completed: boolean;
  created_at: string;
  payment_requested_at?: string;
  paid_at?: string;
  platform_fee?: number;
  designer_payout_amount?: number;
  settled_at?: string;
};

export type AccumulatedSeedProfileConfig = {
  key: string;
  designer: BetaTestAccount;
  customers: BetaTestAccount[];
  historyYears: number;
  dailyMin: number;
  dailyMax: number;
  treatmentIdPrefix: string;
  paymentIdPrefix: string;
};

export type AccumulatedSeedProfileStats = {
  profileKey: string;
  designerId: string;
  designerName: string;
  customerCount: number;
  treatmentCount: number;
  paymentCount: number;
  seedStartDate: string;
  yearSpanLabel: string;
  oldestTreatmentDate: string | null;
  newestTreatmentDate: string | null;
  activeDays: number;
  weeklyTreatmentsLabel: string;
  avgDailyTreatments: number;
  minDailyTreatments: number;
  maxDailyTreatments: number;
};

export type BuiltAccumulatedSeedProfile = AccumulatedSeedProfileConfig & {
  treatments: AccumulatedDemoTreatment[];
  payments: PaymentRecord[];
  stats: AccumulatedSeedProfileStats;
};

const TREATMENT_TEMPLATES = [
  { type: '컷', title: '레이어드 컷', price: 120000, duration: '1시간 20분' },
  { type: '컬러', title: '애쉬브라운 컬러', price: 180000, duration: '2시간 30분' },
  { type: '펌', title: '볼륨 디지털 펌', price: 220000, duration: '3시간' },
  { type: '매직', title: '매직스트레이트', price: 280000, duration: '4시간' },
  { type: '트리트먼트', title: '단백질 딥 케어', price: 90000, duration: '1시간' },
  { type: '탈색', title: '탈색 + 톤다운', price: 260000, duration: '3시간 40분' },
] as const;

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

function dailyTreatmentCountForDay(dayIndex: number, dailyMin: number, dailyMax: number) {
  const span = dailyMax - dailyMin + 1;
  return dailyMin + (dayIndex % span);
}

function resolvePaymentStatus(
  date: string,
  treatmentSeq: number,
  customerIndex: number,
): PaymentStatus {
  const visitDateObj = new Date(`${date}T12:00:00`);
  const monthsAgo = monthsBetween(visitDateObj, new Date());

  if (monthsAgo <= 1 && customerIndex % 4 === 0 && treatmentSeq % 13 === 0) {
    return 'payment_requested';
  }

  if (monthsAgo <= 2 && customerIndex % 3 === 1 && treatmentSeq % 17 === 0) {
    return 'escrow';
  }

  if (monthsAgo <= 1 && customerIndex % 5 === 2 && treatmentSeq % 19 === 0) {
    return 'escrow';
  }

  return 'completed';
}

function buildTreatmentDateSlots(config: AccumulatedSeedProfileConfig, seedStartDate: Date) {
  const endDate = new Date();
  const slots: string[] = [];
  let dayIndex = 0;

  for (let day = new Date(seedStartDate); day.getTime() <= endDate.getTime(); day = addDays(day, 1)) {
    const dailyCount = dailyTreatmentCountForDay(dayIndex, config.dailyMin, config.dailyMax);

    for (let slot = 0; slot < dailyCount; slot += 1) {
      slots.push(formatDate(day));
    }

    dayIndex += 1;
  }

  return slots;
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

export function buildAccumulatedSeedProfile(
  config: AccumulatedSeedProfileConfig,
): BuiltAccumulatedSeedProfile {
  const seedStartDate = getSeedStartDate(config.historyYears);
  const dateSlots = buildTreatmentDateSlots(config, seedStartDate);
  const treatments: AccumulatedDemoTreatment[] = [];
  const payments: PaymentRecord[] = [];

  dateSlots.forEach((treatmentDate, treatmentSeq) => {
    const customerIndex = treatmentSeq % config.customers.length;
    const customer = config.customers[customerIndex];
    const template = TREATMENT_TEMPLATES[treatmentSeq % TREATMENT_TEMPLATES.length];
    const paymentStatus = resolvePaymentStatus(treatmentDate, treatmentSeq, customerIndex);
    const treatmentId = `${config.treatmentIdPrefix}${String(treatmentSeq + 1).padStart(4, '0')}`;
    const price = template.price + (treatmentSeq % 3) * 10000;
    const fees = calculatePaymentFees(price);
    const paidAt = isoAt(treatmentDate, 10 + (treatmentSeq % 8));
    const settledAt = isoAt(treatmentDate, 9);

    const treatment: AccumulatedDemoTreatment = {
      id: treatmentId,
      customer_id: customer.id,
      designer_id: config.designer.id,
      designer_name: config.designer.name ?? '디자이너',
      customer_name: customer.name ?? '고객',
      treatment_date: treatmentDate,
      treatment_type: template.type,
      treatment_title: template.title,
      products: ['로레알', '아모스'],
      damage_level: 4 + (treatmentSeq % 4),
      duration: template.duration,
      technique: `${template.type} 시술 기법 (테스트)`,
      designer_diagnosis: `${customer.name}님 ${template.type} 시술 기록 (테스트 데이터)`,
      home_care: '정기 케어와 수분 관리를 권장합니다.',
      ai_insight: '다음 방문 전 홈케어 루틴을 유지해 주세요.',
      price,
      payment_status: paymentStatus,
      feedback_completed: paymentStatus === 'completed' || paymentStatus === 'escrow',
      created_at: paidAt,
    };

    if (paymentStatus === 'payment_requested') {
      treatment.payment_requested_at = paidAt;
      treatments.push(treatment);
      return;
    }

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
      customer_id: customer.id,
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
  });

  treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));

  const dailyLabel = `일 ${config.dailyMin}~${config.dailyMax}건 · 주 7일`;
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
