import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BetaTestAccount } from './beta-test-accounts';
import { calculatePaymentFees, PLATFORM_FEE_RATE, type PaymentRecord } from './payment-record';
import type { PaymentStatus } from './payment-status';
import type { Treatment } from './treatments';

export const ACCUMULATED_TEST_PASSWORD = 'test1234';
const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

/** 3년 누적 테스트용 디자이너 1명 */
export const ACCUMULATED_TEST_DESIGNER: BetaTestAccount = {
  id: 'test-designer-3y',
  email: 'test-designer@hair.app',
  name: '누적테스트 디자이너',
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'designer',
};

const CUSTOMER_NAMES = [
  '이서연',
  '박민준',
  '최유나',
  '정하은',
  '김도윤',
  '한지우',
  '오수아',
  '윤태희',
  '강예린',
  '임준서',
] as const;

/** 3년 누적 테스트용 고객 10명 */
export const ACCUMULATED_TEST_CUSTOMERS: BetaTestAccount[] = CUSTOMER_NAMES.map((name, index) => ({
  id: `test-customer-${String(index + 1).padStart(2, '0')}`,
  email: `test-customer-${index + 1}@hair.app`,
  name,
  password: ACCUMULATED_TEST_PASSWORD,
  role: 'customer',
}));

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

function visitDate(customerIndex: number, visitIndex: number, visitCount: number) {
  const start = new Date(2023, 4, 8);
  const end = new Date();
  const progress = visitCount <= 1 ? 1 : visitIndex / (visitCount - 1);
  const baseMs = start.getTime() + progress * (end.getTime() - start.getTime());
  const jitterDays = (customerIndex * 5 + visitIndex * 11) % 20;
  const date = new Date(baseMs + jitterDays * 86400000);

  if (date.getTime() > end.getTime()) {
    return formatDate(end);
  }

  return formatDate(date);
}

function resolvePaymentStatus(date: string, isLatest: boolean, customerIndex: number): PaymentStatus {
  const visitDateObj = new Date(`${date}T12:00:00`);
  const monthsAgo = monthsBetween(visitDateObj, new Date());

  if (isLatest && monthsAgo <= 1 && customerIndex % 4 === 0) {
    return 'payment_requested';
  }

  if (isLatest && monthsAgo <= 2 && customerIndex % 3 === 1) {
    return 'escrow';
  }

  if (monthsAgo <= 1 && customerIndex % 5 === 2) {
    return 'escrow';
  }

  return 'completed';
}

function isoAt(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function buildTreatmentsAndPayments() {
  const treatments: Treatment[] = [];
  const payments: PaymentRecord[] = [];

  for (let customerIndex = 0; customerIndex < ACCUMULATED_TEST_CUSTOMERS.length; customerIndex += 1) {
    const customer = ACCUMULATED_TEST_CUSTOMERS[customerIndex];
    const visitCount = 6 + (customerIndex % 5);

    for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
      const treatmentDate = visitDate(customerIndex, visitIndex, visitCount);
      const isLatest = visitIndex === visitCount - 1;
      const template = TREATMENT_TEMPLATES[(customerIndex + visitIndex) % TREATMENT_TEMPLATES.length];
      const paymentStatus = resolvePaymentStatus(treatmentDate, isLatest, customerIndex);
      const treatmentId = `accum-treatment-c${String(customerIndex + 1).padStart(2, '0')}-v${visitIndex + 1}`;
      const price = template.price + (visitIndex % 3) * 10000;
      const fees = calculatePaymentFees(price);
      const paidAt = isoAt(treatmentDate, 14);
      const settledAt = isoAt(treatmentDate, 10);

      const treatment: Treatment = {
        id: treatmentId,
        customer_id: customer.id,
        designer_id: DESIGNER_ID,
        designer_name: DESIGNER_NAME,
        customer_name: customer.name,
        treatment_date: treatmentDate,
        treatment_type: template.type,
        treatment_title: template.title,
        products: ['로레알', '아모스'],
        damage_level: 4 + (visitIndex % 4),
        duration: template.duration,
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
        continue;
      }

      treatment.paid_at = paidAt;
      treatment.platform_fee = fees.feeAmount;
      treatment.designer_payout_amount = fees.designerPayout;

      if (paymentStatus === 'completed') {
        treatment.settled_at = settledAt;
      }

      treatments.push(treatment);

      const payment: PaymentRecord = {
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
      };

      payments.push(payment);
    }
  }

  treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));

  return { treatments, payments };
}

const generated = buildTreatmentsAndPayments();

export const ACCUMULATED_DEMO_TREATMENTS: Treatment[] = generated.treatments;
export const ACCUMULATED_DEMO_PAYMENTS: PaymentRecord[] = generated.payments;

export const ACCUMULATED_TEST_ACCOUNTS: BetaTestAccount[] = [
  ACCUMULATED_TEST_DESIGNER,
  ...ACCUMULATED_TEST_CUSTOMERS,
];

export const ACCUMULATED_TEST_LOGIN_SUMMARY = {
  designer: {
    email: ACCUMULATED_TEST_DESIGNER.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: ACCUMULATED_TEST_DESIGNER.name,
  },
  customers: ACCUMULATED_TEST_CUSTOMERS.map((customer) => ({
    email: customer.email,
    password: ACCUMULATED_TEST_PASSWORD,
    name: customer.name,
  })),
  treatmentCount: ACCUMULATED_DEMO_TREATMENTS.length,
  customerCount: ACCUMULATED_TEST_CUSTOMERS.length,
  yearSpan: '2023~현재',
} as const;

export async function mergeAccumulatedDesignerRelationships() {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  const items: { designer_id: string; customer_id: string }[] = raw ? JSON.parse(raw) : [];
  let changed = false;

  for (const customer of ACCUMULATED_TEST_CUSTOMERS) {
    const exists = items.some(
      (item) => item.designer_id === DESIGNER_ID && item.customer_id === customer.id,
    );

    if (!exists) {
      items.push({ designer_id: DESIGNER_ID, customer_id: customer.id });
      changed = true;
    }
  }

  if (changed) {
    await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
  }
}
