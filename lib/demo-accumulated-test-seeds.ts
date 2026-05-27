import type { PaymentStatus } from './payment-status';
import { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-fees';
import type { PaymentRecord } from './payment-types';
import {
  ACCUMULATED_TEST_CUSTOMERS,
  ACCUMULATED_TEST_DESIGNER,
} from './demo-accumulated-test-accounts';

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

const DESIGNER_ID = ACCUMULATED_TEST_DESIGNER.id;
const DESIGNER_NAME = ACCUMULATED_TEST_DESIGNER.name;

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

const SEED_HISTORY_YEARS = 2;

function getSeedStartDate(reference = new Date()) {
  const start = new Date(reference);
  start.setFullYear(start.getFullYear() - SEED_HISTORY_YEARS);
  start.setHours(12, 0, 0, 0);
  return start;
}

const SEED_START_DATE = getSeedStartDate();
/** 최근 2년~현재 매일 6~9건 — 캘린더 전체에 골고루 분포 */
const DAILY_TREATMENTS_MIN = 6;
const DAILY_TREATMENTS_MAX = 9;

function dailyTreatmentCountForDay(dayIndex: number) {
  const span = DAILY_TREATMENTS_MAX - DAILY_TREATMENTS_MIN + 1;
  return DAILY_TREATMENTS_MIN + (dayIndex % span);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function pushTreatmentForDay(
  treatments: AccumulatedDemoTreatment[],
  payments: PaymentRecord[],
  treatmentDate: string,
  treatmentSeq: number,
) {
  const customerIndex = treatmentSeq % ACCUMULATED_TEST_CUSTOMERS.length;
  const customer = ACCUMULATED_TEST_CUSTOMERS[customerIndex];
  const template = TREATMENT_TEMPLATES[treatmentSeq % TREATMENT_TEMPLATES.length];
  const paymentStatus = resolvePaymentStatus(treatmentDate, treatmentSeq, customerIndex);
  const treatmentId = `accum-treatment-${String(treatmentSeq + 1).padStart(4, '0')}`;
  const price = template.price + (treatmentSeq % 3) * 10000;
  const fees = calculatePaymentFees(price);
  const paidAt = isoAt(treatmentDate, 10 + (treatmentSeq % 8));
  const settledAt = isoAt(treatmentDate, 9);

  const treatment: AccumulatedDemoTreatment = {
    id: treatmentId,
    customer_id: customer.id,
    designer_id: DESIGNER_ID,
    designer_name: DESIGNER_NAME,
    customer_name: customer.name,
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
    id: `accum-payment-${treatmentId}`,
    treatment_id: treatmentId,
    customer_id: customer.id,
    designer_id: DESIGNER_ID,
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

function isoAt(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function buildTreatmentDateSlots() {
  const endDate = new Date();
  const slots: string[] = [];
  let dayIndex = 0;

  for (
    let day = new Date(SEED_START_DATE);
    day.getTime() <= endDate.getTime();
    day = addDays(day, 1)
  ) {
    const dailyCount = dailyTreatmentCountForDay(dayIndex);
    const treatmentDate = formatDate(day);

    for (let slot = 0; slot < dailyCount; slot += 1) {
      slots.push(treatmentDate);
    }

    dayIndex += 1;
  }

  return slots;
}

function buildTreatmentsAndPayments() {
  const treatments: AccumulatedDemoTreatment[] = [];
  const payments: PaymentRecord[] = [];
  const dateSlots = buildTreatmentDateSlots();

  dateSlots.forEach((treatmentDate, treatmentSeq) => {
    pushTreatmentForDay(treatments, payments, treatmentDate, treatmentSeq);
  });

  treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));

  return { treatments, payments };
}

const generated = buildTreatmentsAndPayments();

export const ACCUMULATED_DEMO_TREATMENTS: AccumulatedDemoTreatment[] = generated.treatments;
export const ACCUMULATED_DEMO_PAYMENTS: PaymentRecord[] = generated.payments;

function computeSeedWorkloadStats(treatments: AccumulatedDemoTreatment[]) {
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
    weeklyTreatmentsLabel: '일 6~9건 · 주 7일',
  };
}

const workloadStats = computeSeedWorkloadStats(ACCUMULATED_DEMO_TREATMENTS);

export const ACCUMULATED_DEMO_SEED_STATS = {
  designerId: DESIGNER_ID,
  designerName: DESIGNER_NAME,
  customerCount: ACCUMULATED_TEST_CUSTOMERS.length,
  treatmentCount: ACCUMULATED_DEMO_TREATMENTS.length,
  paymentCount: ACCUMULATED_DEMO_PAYMENTS.length,
  seedStartDate: formatDate(SEED_START_DATE),
  yearSpanLabel: `${SEED_START_DATE.getFullYear()}~현재`,
  oldestTreatmentDate: ACCUMULATED_DEMO_TREATMENTS.at(-1)?.treatment_date ?? null,
  newestTreatmentDate: ACCUMULATED_DEMO_TREATMENTS[0]?.treatment_date ?? null,
  activeDays: workloadStats.activeDays,
  weeklyTreatmentsLabel: workloadStats.weeklyTreatmentsLabel,
  avgDailyTreatments: workloadStats.avgDailyTreatments,
  minDailyTreatments: workloadStats.minDailyTreatments,
  maxDailyTreatments: workloadStats.maxDailyTreatments,
} as const;
