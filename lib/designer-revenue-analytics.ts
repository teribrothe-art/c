import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import {
  calculatePaymentFees,
  getDesignerDemoPayments,
  getPaymentByTreatmentId,
  PaymentRecord,
} from './payment-record';
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
import { getDesignerTreatments, type Treatment } from './treatments';

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
  /** @deprecated monthPendingPayoutAmount 사용 */
  pendingPayoutAmount: number;
  /** @deprecated monthPendingPayoutCount 사용 */
  pendingPayoutCount: number;
  /** 선택한 달의 시술 기록 건수 (정산 여부 무관) */
  selectedMonthTreatmentCount: number;
  /** 선택한 달 · treatment_date 기준 일별 시술 건수 */
  treatmentCountByDate: Record<string, number>;
  /** 선택한 달 · 시술일 기준 정산 대기 */
  monthPendingPayoutAmount: number;
  monthPendingPayoutCount: number;
  /** 선택한 주(월~일) · 시술일 기준 정산 대기 */
  weekPendingPayoutAmount: number;
  weekPendingPayoutCount: number;
  /** 선택한 달 · 시술일 기준 일별 정산 대기 */
  pendingPayoutByDate: Record<string, { amount: number; count: number }>;
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

function payoutOf(payment: PaymentRecord) {
  return payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
}

function isAwaitingSettlement(status: PaymentRecord['status']) {
  return status === 'paid' || status === 'in_escrow';
}

function treatmentDateOf(treatment: Treatment | undefined, payment: PaymentRecord) {
  if (treatment?.treatment_date) {
    return treatment.treatment_date;
  }

  return (payment.paid_at ?? payment.created_at).slice(0, 10);
}

function buildTreatmentCountByDate(treatments: Treatment[], monthKey: string) {
  const map: Record<string, number> = {};

  for (const treatment of treatments) {
    if (monthKeyFromDate(treatment.treatment_date) !== monthKey) {
      continue;
    }

    map[treatment.treatment_date] = (map[treatment.treatment_date] ?? 0) + 1;
  }

  return map;
}

function buildPendingPayoutByDate(
  payments: PaymentRecord[],
  treatmentMap: Map<string, Treatment>,
  monthKey: string,
) {
  const map: Record<string, { amount: number; count: number }> = {};

  for (const payment of payments) {
    if (!isAwaitingSettlement(payment.status)) {
      continue;
    }

    const treatment = treatmentMap.get(payment.treatment_id);
    const date = treatmentDateOf(treatment, payment);

    if (monthKeyFromDate(date) !== monthKey) {
      continue;
    }

    const current = map[date] ?? { amount: 0, count: 0 };
    current.amount += payoutOf(payment);
    current.count += 1;
    map[date] = current;
  }

  return map;
}

function sumPendingForDates(
  pendingByDate: Record<string, { amount: number; count: number }>,
  dates: string[],
) {
  return dates.reduce(
    (acc, date) => {
      const stats = pendingByDate[date];

      if (!stats) {
        return acc;
      }

      acc.amount += stats.amount;
      acc.count += stats.count;

      return acc;
    },
    { amount: 0, count: 0 },
  );
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

    const emptyWeekStart = getWeekStartMonday(`${month}-01`);
    const emptyDays = buildWeeklyRevenueWeeks([], month)[0]?.days ?? [];

    return {
      months: [emptyMonth(month)],
      selectedMonthKey: month,
      selectedMonth: emptyMonth(month),
      weeklyWeeks: buildWeeklyRevenueWeeks([], month),
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
      selectedMonthTreatmentCount: 0,
      treatmentCountByDate: {},
      monthPendingPayoutAmount: 0,
      monthPendingPayoutCount: 0,
      weekPendingPayoutAmount: 0,
      weekPendingPayoutCount: 0,
      pendingPayoutByDate: {},
      recentSettlements: [],
    };
  }

  const { treatments } = await getDesignerTreatments();
  const treatmentMap = new Map(treatments.map((treatment) => [treatment.id, treatment]));
  const payments = await loadDesignerPayments(user.id, treatments);
  const completed = payments.filter((payment) => payment.status === 'completed');

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

  const treatmentCountByDate = buildTreatmentCountByDate(treatments, resolvedMonthKey);
  const pendingPayoutByDate = buildPendingPayoutByDate(payments, treatmentMap, resolvedMonthKey);
  const monthPending = sumPendingForDates(pendingPayoutByDate, Object.keys(pendingPayoutByDate));
  const weekPending = sumPendingForDates(
    pendingPayoutByDate,
    selectedWeek.days.map((day) => day.date),
  );

  const monthTreatments = treatments.filter(
    (treatment) => monthKeyFromDate(treatment.treatment_date) === resolvedMonthKey,
  );
  const selectedMonthTreatmentCount = monthTreatments.length;

  const recentSettlements = payments
    .filter((payment) => payment.status === 'completed')
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
    pendingPayoutAmount: monthPending.amount,
    pendingPayoutCount: monthPending.count,
    selectedMonthTreatmentCount,
    treatmentCountByDate,
    monthPendingPayoutAmount: monthPending.amount,
    monthPendingPayoutCount: monthPending.count,
    weekPendingPayoutAmount: weekPending.amount,
    weekPendingPayoutCount: weekPending.count,
    pendingPayoutByDate,
    recentSettlements,
  };
}
