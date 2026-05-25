import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { calculatePaymentFees, getPaymentByTreatmentId, PaymentRecord } from './payment-record';
import {
  buildWeeklyRevenueWeeks,
  formatDateWithWeekday,
  getWeekStartMonday,
  resolveDefaultWeekKey,
  toLocalDateString,
  type WeeklyRevenueWeek,
  type WeekdayRevenueCell,
} from './designer-revenue-weekly';
import { supabase } from './supabase';
import { getDesignerTreatments } from './treatments';

export type { WeekdayRevenueCell, WeeklyRevenueWeek };
export { formatDateWithWeekday };

export type MonthlyRevenueBucket = {
  monthKey: string;
  label: string;
  revenue: number;
  settlementCount: number;
};

export type DailyRevenuePoint = {
  date: string;
  label: string;
  totalAmount: number;
  settlementCount: number;
};

export type DesignerRevenueAnalytics = {
  months: MonthlyRevenueBucket[];
  selectedMonthKey: string;
  selectedMonth: MonthlyRevenueBucket;
  weeklyWeeks: WeeklyRevenueWeek[];
  selectedWeekKey: string;
  selectedWeek: WeeklyRevenueWeek;
  dailyTotals: DailyRevenuePoint[];
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  averageTreatmentPrice: number;
  recentSettlements: {
    paymentId: string;
    customerName: string;
    treatmentTitle: string;
    date: string;
    dateWithWeekdayLabel: string;
    payout: number;
  }[];
};

function currentMonthKey() {
  return toLocalDateString().slice(0, 7);
}

export function formatMonthKeyLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${year}년 ${Number(month)}월`;
}

function formatDayLabel(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}.${Number(day)}`;
}

function settlementDateOf(payment: PaymentRecord) {
  return (payment.settled_at ?? payment.paid_at ?? payment.created_at).slice(0, 10);
}

function monthKeyFromDate(date: string) {
  return date.slice(0, 7);
}

async function loadDesignerPayments(designerId: string): Promise<PaymentRecord[]> {
  if (isDemoAuthMode || !supabase) {
    const { treatments } = await getDesignerTreatments();
    const records: PaymentRecord[] = [];

    for (const treatment of treatments) {
      const payment = await getPaymentByTreatmentId(treatment.id);

      if (payment) {
        records.push(payment);
      }
    }

    return records;
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

function payoutOf(payment: PaymentRecord) {
  return payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
}

function buildMonthlyBuckets(completed: PaymentRecord[]): MonthlyRevenueBucket[] {
  const map = new Map<string, { revenue: number; settlementCount: number }>();

  for (const payment of completed) {
    const date = settlementDateOf(payment);
    const monthKey = monthKeyFromDate(date);
    const current = map.get(monthKey) ?? { revenue: 0, settlementCount: 0 };

    current.revenue += payoutOf(payment);
    current.settlementCount += 1;
    map.set(monthKey, current);
  }

  return [...map.entries()]
    .map(([monthKey, stats]) => ({
      monthKey,
      label: formatMonthKeyLabel(monthKey),
      revenue: stats.revenue,
      settlementCount: stats.settlementCount,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function buildDailyTotals(completed: PaymentRecord[], monthKey: string): DailyRevenuePoint[] {
  const map = new Map<string, { totalAmount: number; settlementCount: number }>();

  for (const payment of completed) {
    const date = settlementDateOf(payment);

    if (monthKeyFromDate(date) !== monthKey) {
      continue;
    }

    const current = map.get(date) ?? { totalAmount: 0, settlementCount: 0 };
    current.totalAmount += payoutOf(payment);
    current.settlementCount += 1;
    map.set(date, current);
  }

  return [...map.entries()]
    .map(([date, stats]) => ({
      date,
      label: formatDayLabel(date),
      totalAmount: stats.totalAmount,
      settlementCount: stats.settlementCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function emptyMonth(monthKey: string): MonthlyRevenueBucket {
  return {
    monthKey,
    label: formatMonthKeyLabel(monthKey),
    revenue: 0,
    settlementCount: 0,
  };
}

export async function fetchDesignerRevenueAnalytics(
  selectedMonthKey?: string,
  selectedWeekKey?: string,
): Promise<DesignerRevenueAnalytics> {
  const user = await getCurrentUser();
  const fallbackMonth = currentMonthKey();

  if (!user || user.role !== 'designer') {
    const month = selectedMonthKey ?? fallbackMonth;

    const emptyWeekStart = `${month}-01`;
    const emptyDays = buildWeeklyRevenueWeeks([], month)[0]?.days ?? [];

    return {
      months: [emptyMonth(month)],
      selectedMonthKey: month,
      selectedMonth: emptyMonth(month),
      weeklyWeeks: [],
      selectedWeekKey: emptyWeekStart,
      selectedWeek: {
        weekKey: emptyWeekStart,
        label: '',
        days: emptyDays,
        weekTotal: 0,
        settlementCount: 0,
      },
      dailyTotals: [],
      pendingPayoutAmount: 0,
      pendingPayoutCount: 0,
      averageTreatmentPrice: 0,
      recentSettlements: [],
    };
  }

  const { treatments } = await getDesignerTreatments();
  const treatmentMap = new Map(treatments.map((treatment) => [treatment.id, treatment]));
  const payments = await loadDesignerPayments(user.id);
  const completed = payments.filter((payment) => payment.status === 'completed' && payment.settled_at);

  let months = buildMonthlyBuckets(completed);

  if (!months.some((month) => month.monthKey === fallbackMonth)) {
    months = [emptyMonth(fallbackMonth), ...months];
  }

  if (months.length === 0) {
    months = [emptyMonth(fallbackMonth)];
  }

  months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const resolvedMonthKey =
    selectedMonthKey && months.some((month) => month.monthKey === selectedMonthKey)
      ? selectedMonthKey
      : months[0]?.monthKey ?? fallbackMonth;

  const selectedMonth = months.find((month) => month.monthKey === resolvedMonthKey) ?? emptyMonth(resolvedMonthKey);
  const weeklyWeeks = buildWeeklyRevenueWeeks(completed, resolvedMonthKey);
  const resolvedWeekKey =
    selectedWeekKey && weeklyWeeks.some((week) => week.weekKey === selectedWeekKey)
      ? selectedWeekKey
      : resolveDefaultWeekKey(weeklyWeeks, resolvedMonthKey);
  const selectedWeek =
    weeklyWeeks.find((week) => week.weekKey === resolvedWeekKey) ?? weeklyWeeks[0] ?? {
      weekKey: resolvedWeekKey,
      label: '',
      days: buildWeeklyRevenueWeeks([], resolvedMonthKey)[0]?.days ?? [],
      weekTotal: 0,
      settlementCount: 0,
    };
  const dailyTotals = buildDailyTotals(completed, resolvedMonthKey);

  const paidPending = payments.filter(
    (payment) => payment.status === 'paid' || payment.status === 'in_escrow',
  );
  const pendingPayoutAmount = paidPending.reduce((sum, payment) => sum + payoutOf(payment), 0);

  const monthTreatments = treatments.filter(
    (treatment) => monthKeyFromDate(treatment.treatment_date) === resolvedMonthKey,
  );
  const priced = monthTreatments.filter((treatment) => (treatment.price ?? 0) > 0);
  const averageTreatmentPrice =
    priced.length > 0
      ? Math.round(priced.reduce((sum, treatment) => sum + (treatment.price ?? 0), 0) / priced.length)
      : 0;

  const recentSettlements = payments
    .filter((payment) => payment.status === 'completed' && payment.settled_at)
    .filter((payment) => monthKeyFromDate(settlementDateOf(payment)) === resolvedMonthKey)
    .sort((a, b) => (b.settled_at ?? '').localeCompare(a.settled_at ?? ''))
    .slice(0, 8)
    .map((payment) => {
      const treatment = treatmentMap.get(payment.treatment_id);

      const date = settlementDateOf(payment);

      return {
        paymentId: payment.id,
        customerName: treatment?.customer_name || '고객',
        treatmentTitle: treatment?.treatment_title || '시술',
        date,
        dateWithWeekdayLabel: formatDateWithWeekday(date),
        payout: payoutOf(payment),
      };
    });

  return {
    months,
    selectedMonthKey: resolvedMonthKey,
    selectedMonth,
    weeklyWeeks,
    selectedWeekKey: resolvedWeekKey,
    selectedWeek,
    dailyTotals,
    pendingPayoutAmount,
    pendingPayoutCount: paidPending.length,
    averageTreatmentPrice,
    recentSettlements,
  };
}
