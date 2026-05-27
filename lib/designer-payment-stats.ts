import { getCurrentUser, isDemoAuthMode } from './auth';
import { toLocalDateString } from './designer-revenue-weekly';
import { toAppError } from './errors';
import {
  calculatePaymentFees,
  getDesignerDemoPayments,
  getPaymentByTreatmentId,
  PaymentRecord,
} from './payment-record';
import { supabase } from './supabase';
import { getDesignerTreatments, Treatment } from './treatments';

export function getCurrentSettlementMonthKey() {
  return toLocalDateString().slice(0, 7);
}

function settlementDateOf(payment: PaymentRecord): string | null {
  const raw = payment.settled_at ?? payment.paid_at ?? payment.created_at;

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toLocalDateString(parsed);
}

function settlementMonthKey(payment: PaymentRecord) {
  const date = settlementDateOf(payment);
  return date ? date.slice(0, 7) : '';
}

function isTreatmentInCurrentMonth(treatmentDate: string) {
  return treatmentDate.slice(0, 7) === getCurrentSettlementMonthKey();
}

export type SettlementListItem = {
  paymentId: string;
  treatmentId: string;
  customerName: string;
  treatmentTitle: string;
  date: string;
  payout: number;
  feeAmount: number;
  amount: number;
};

export type DesignerPaymentDashboard = {
  monthRevenue: number;
  monthSettlementCount: number;
  averageTreatmentPrice: number;
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  recentSettlements: SettlementListItem[];
};

function isAwaitingSettlement(status: PaymentRecord['status']) {
  return status === 'paid' || status === 'in_escrow';
}

async function loadDesignerPayments(
  designerId: string,
  treatments: { id: string }[],
): Promise<PaymentRecord[]> {
  if (isDemoAuthMode || !supabase) {
    let payments = await getDesignerDemoPayments(designerId);

    if (payments.length === 0 && treatments.length > 0) {
      const records: PaymentRecord[] = [];

      for (const treatment of treatments) {
        const payment = await getPaymentByTreatmentId(treatment.id);

        if (payment && payment.designer_id === designerId) {
          records.push(payment);
        }
      }

      payments = records;
    }

    return payments;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('designer_id', designerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error);
  }

  return (data ?? []) as PaymentRecord[];
}

export async function fetchDesignerPaymentDashboard(): Promise<DesignerPaymentDashboard> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return {
      monthRevenue: 0,
      monthSettlementCount: 0,
      averageTreatmentPrice: 0,
      pendingPayoutAmount: 0,
      pendingPayoutCount: 0,
      recentSettlements: [],
    };
  }

  const { treatments } = await getDesignerTreatments();
  const treatmentMap = new Map(treatments.map((t) => [t.id, t]));
  const payments = await loadDesignerPayments(user.id, treatments);

  const completedThisMonth = payments.filter(
    (p) => p.status === 'completed' && settlementMonthKey(p) === getCurrentSettlementMonthKey(),
  );

  const monthRevenue = completedThisMonth.reduce((sum, p) => sum + (p.designer_payout ?? 0), 0);
  const monthSettlementCount = completedThisMonth.length;

  const paidPending = payments.filter((p) => isAwaitingSettlement(p.status));
  const pendingPayoutAmount = paidPending.reduce(
    (sum, p) => sum + (p.designer_payout ?? calculatePaymentFees(p.amount).designerPayout),
    0,
  );

  const monthTreatments = treatments.filter((t) => isTreatmentInCurrentMonth(t.treatment_date));
  const priced = monthTreatments.filter((t) => (t.price ?? 0) > 0);
  const averageTreatmentPrice =
    priced.length > 0
      ? Math.round(priced.reduce((sum, t) => sum + (t.price ?? 0), 0) / priced.length)
      : 0;

  const recentSettlements = payments
    .filter((p) => p.status === 'completed' && p.settled_at)
    .sort((a, b) => (b.settled_at ?? '').localeCompare(a.settled_at ?? ''))
    .slice(0, 5)
    .map((p) => {
      const treatment = treatmentMap.get(p.treatment_id);
      return {
        paymentId: p.id,
        treatmentId: p.treatment_id,
        customerName: treatment?.customer_name || '고객',
        treatmentTitle: treatment?.treatment_title || '시술',
        date: (p.settled_at ?? treatment?.treatment_date ?? '').slice(0, 10),
        payout: p.designer_payout ?? 0,
        feeAmount: p.fee_amount ?? 0,
        amount: p.amount,
      };
    });

  return {
    monthRevenue,
    monthSettlementCount,
    averageTreatmentPrice,
    pendingPayoutAmount,
    pendingPayoutCount: paidPending.length,
    recentSettlements,
  };
}

export type MonthlySettlementTotal = {
  monthKey: string;
  label: string;
  amount: number;
  settlementCount: number;
};

export function formatMonthSettlementLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const currentKey = getCurrentSettlementMonthKey();

  if (monthKey === currentKey) {
    return '이번 달 정산 총액';
  }

  if (year === currentKey.slice(0, 4)) {
    return `${Number(month)}월 정산 총액`;
  }

  return `${year}년 ${Number(month)}월 정산 총액`;
}

function buildMonthlySettlementTotals(
  completed: PaymentRecord[],
  payoutOf: (payment: PaymentRecord) => number,
): MonthlySettlementTotal[] {
  const map = new Map<string, { amount: number; settlementCount: number }>();

  for (const payment of completed) {
    const monthKey = settlementMonthKey(payment);

    if (!monthKey) {
      continue;
    }
    const current = map.get(monthKey) ?? { amount: 0, settlementCount: 0 };
    current.amount += payoutOf(payment);
    current.settlementCount += 1;
    map.set(monthKey, current);
  }

  return [...map.entries()]
    .map(([monthKey, stats]) => ({
      monthKey,
      label: formatMonthSettlementLabel(monthKey),
      amount: stats.amount,
      settlementCount: stats.settlementCount,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export type DesignerProfilePaymentStats = {
  totalSettlementAmount: number;
  monthSettlementAmount: number;
  monthlySettlementTotals: MonthlySettlementTotal[];
  pendingSettlementCount: number;
  recentSettlements: SettlementListItem[];
};

export async function fetchDesignerProfilePaymentStats(): Promise<DesignerProfilePaymentStats> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return {
      totalSettlementAmount: 0,
      monthSettlementAmount: 0,
      monthlySettlementTotals: [],
      pendingSettlementCount: 0,
      recentSettlements: [],
    };
  }

  const { treatments } = await getDesignerTreatments();
  const treatmentMap = new Map(treatments.map((t) => [t.id, t]));
  const payments = await loadDesignerPayments(user.id, treatments);
  const completed = payments.filter((p) => p.status === 'completed');
  const payoutOf = (p: PaymentRecord) =>
    p.designer_payout ?? calculatePaymentFees(p.amount).designerPayout;

  const totalSettlementAmount = completed.reduce((sum, p) => sum + payoutOf(p), 0);
  const pendingSettlementCount = payments.filter((p) => isAwaitingSettlement(p.status)).length;

  const recentSettlements = payments
    .filter((p) => p.status === 'completed' && p.settled_at)
    .sort((a, b) => (b.settled_at ?? '').localeCompare(a.settled_at ?? ''))
    .slice(0, 5)
    .map((p) => {
      const treatment = treatmentMap.get(p.treatment_id);
      return {
        paymentId: p.id,
        treatmentId: p.treatment_id,
        customerName: treatment?.customer_name || '고객',
        treatmentTitle: treatment?.treatment_title || '시술',
        date: (p.settled_at ?? treatment?.treatment_date ?? '').slice(0, 10),
        payout: payoutOf(p),
        feeAmount: p.fee_amount ?? calculatePaymentFees(p.amount).feeAmount,
        amount: p.amount,
      };
    });

  const monthlySettlementTotals = buildMonthlySettlementTotals(completed, payoutOf);
  const monthSettlementAmount =
    monthlySettlementTotals.find((month) => month.monthKey === getCurrentSettlementMonthKey())
      ?.amount ?? 0;

  return {
    totalSettlementAmount,
    monthSettlementAmount,
    monthlySettlementTotals,
    pendingSettlementCount,
    recentSettlements,
  };
}
