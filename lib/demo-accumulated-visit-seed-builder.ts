import type { PaymentStatus } from './payment-status';
import { calculatePaymentFees, PLATFORM_FEE_RATE } from './payment-record';
import type { PaymentRecord } from './payment-types';
import {
  forEachVisitInCycle,
  type SimulatedVisit,
} from './customer-visit-cycle-simulator';
import {
  getTreatmentTemplatesForRegion,
  type TreatmentTemplate,
} from './regional-treatment-pricing';
import {
  type AccumulatedDemoTreatment,
  type AccumulatedSeedProfileConfig,
  type BuiltAccumulatedSeedProfile,
} from './demo-accumulated-seed-builder';

function templatesForConfig(config: AccumulatedSeedProfileConfig) {
  return getTreatmentTemplatesForRegion(config.priceRegion ?? '전국');
}

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

function isoAt(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
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

function findTemplate(templates: TreatmentTemplate[], type: string, title: string) {
  return (
    templates.find((item) => item.type === type && item.title === title) ??
    templates.find((item) => item.type === type) ??
    templates[0]
  );
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

function appendVisitFromSimulation(
  config: AccumulatedSeedProfileConfig,
  templates: TreatmentTemplate[],
  visit: SimulatedVisit,
  treatments: AccumulatedDemoTreatment[],
  payments: PaymentRecord[],
) {
  const template = findTemplate(templates, visit.treatmentType, visit.treatmentTitle);
  const paymentStatus = resolvePaymentStatus(visit.date, visit.visitIndex, visit.customerIndex);
  const treatmentId = `${config.treatmentIdPrefix}${String(visit.visitIndex + 1).padStart(5, '0')}`;
  const price = visit.price;
  const fees = calculatePaymentFees(price);
  const hour = 9 + ((visit.visitIndex + visit.customerIndex) % 9);
  const paidAt = isoAt(visit.date, hour);
  const settledAt = isoAt(visit.date, Math.max(8, hour - 1));
  const customer = config.customers[visit.customerIndex];

  const treatment: AccumulatedDemoTreatment = {
    id: treatmentId,
    customer_id: visit.customerId,
    designer_id: config.designer.id,
    designer_name: config.designer.name ?? '디자이너',
    customer_name: customer?.name ?? '고객',
    treatment_date: visit.date,
    treatment_type: template.type,
    treatment_title: template.title,
    products: ['로레알'],
    damage_level: 3 + (visit.visitIndex % 5),
    duration: template.duration,
    technique: template.type,
    designer_diagnosis: `${customer?.name ?? '고객'} ${template.type}`,
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
    customer_id: visit.customerId,
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

export function buildVisitCycleAccumulatedSeedProfile(
  config: AccumulatedSeedProfileConfig,
): BuiltAccumulatedSeedProfile {
  const seedStartDate = getSeedStartDate(config.historyYears);
  const templates = templatesForConfig(config);
  const treatments: AccumulatedDemoTreatment[] = [];
  const payments: PaymentRecord[] = [];

  forEachVisitInCycle(
    {
      customerIds: config.customers.map((customer) => customer.id),
      historyYears: config.historyYears,
      dailyMin: config.dailyMin,
      dailyMax: config.dailyMax,
      priceRegion: config.priceRegion ?? '전국',
    },
    (visit) => {
      appendVisitFromSimulation(config, templates, visit, treatments, payments);
    },
  );

  treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));

  const regularCount = config.customers.length;
  const dailyLabel = `일 ${config.dailyMin}~${config.dailyMax}명 · 단골 ${regularCount}명 · 시술별 재방문·주말 가산`;
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
