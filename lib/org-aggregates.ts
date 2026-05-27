import { calculatePaymentFees, type PaymentRecord } from './payment-record';
import { fetchDesignerLedgerForDesignerId } from './services/designer-ledger-service';
import { getOrgDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';
import type { OrgScope } from './org-access';
import type { Treatment } from './treatments';

export type OrgDesignerMetrics = OrgDesignerRosterEntry & {
  treatmentCount: number;
  customerCount: number;
  monthRevenue: number;
  monthTreatmentCount: number;
  pendingPayoutAmount: number;
};

export type OrgDashboardSummary = {
  designerCount: number;
  treatmentCount: number;
  customerCount: number;
  monthRevenue: number;
  monthTreatmentCount: number;
  pendingPayoutAmount: number;
  designers: OrgDesignerMetrics[];
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function uniqueCustomerCount(treatments: Treatment[]) {
  const ids = new Set<string>();

  for (const treatment of treatments) {
    const key = treatment.customer_id ?? treatment.customer_name ?? treatment.id;

    ids.add(key);
  }

  return ids.size;
}

function monthRevenueFromPayments(payments: PaymentRecord[], monthKey: string) {
  let total = 0;

  for (const payment of payments) {
    if (payment.status !== 'completed') {
      continue;
    }

    const date = (payment.settled_at ?? payment.paid_at ?? payment.created_at).slice(0, 7);

    if (date !== monthKey) {
      continue;
    }

    total += payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
  }

  return total;
}

function pendingPayoutFromPayments(payments: PaymentRecord[], treatments: Treatment[], monthKey: string) {
  const treatmentMap = new Map(treatments.map((treatment) => [treatment.id, treatment]));
  let total = 0;

  for (const payment of payments) {
    if (payment.status !== 'paid' && payment.status !== 'in_escrow') {
      continue;
    }

    const treatment = treatmentMap.get(payment.treatment_id);
    const treatmentMonth = treatment?.treatment_date?.slice(0, 7);

    if (treatmentMonth !== monthKey) {
      continue;
    }

    total += payment.designer_payout ?? calculatePaymentFees(payment.amount).designerPayout;
  }

  return total;
}

async function metricsForDesigner(
  entry: OrgDesignerRosterEntry,
  monthKey: string,
): Promise<OrgDesignerMetrics> {
  const ledger = await fetchDesignerLedgerForDesignerId(entry.id);
  const treatments = ledger?.treatments ?? [];
  const payments = ledger?.payments ?? [];
  const monthTreatments = treatments.filter(
    (treatment) => treatment.treatment_date.slice(0, 7) === monthKey,
  );

  return {
    ...entry,
    treatmentCount: treatments.length,
    customerCount: uniqueCustomerCount(treatments),
    monthRevenue: monthRevenueFromPayments(payments, monthKey),
    monthTreatmentCount: monthTreatments.length,
    pendingPayoutAmount: pendingPayoutFromPayments(payments, treatments, monthKey),
  };
}

export async function fetchOrgDashboardSummary(scope: OrgScope): Promise<OrgDashboardSummary> {
  const monthKey = currentMonthKey();
  const roster = getOrgDesignerRoster(scope);
  const designers = await Promise.all(roster.map((entry) => metricsForDesigner(entry, monthKey)));

  return {
    designerCount: designers.length,
    treatmentCount: designers.reduce((sum, item) => sum + item.treatmentCount, 0),
    customerCount: designers.reduce((sum, item) => sum + item.customerCount, 0),
    monthRevenue: designers.reduce((sum, item) => sum + item.monthRevenue, 0),
    monthTreatmentCount: designers.reduce((sum, item) => sum + item.monthTreatmentCount, 0),
    pendingPayoutAmount: designers.reduce((sum, item) => sum + item.pendingPayoutAmount, 0),
    designers,
  };
}
