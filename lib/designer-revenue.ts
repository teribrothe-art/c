import { Treatment } from './treatments';

export type RevenueSummary = {
  monthRevenue: number;
  monthTreatmentCount: number;
  newCustomerCount: number;
  pendingSettlementCount: number;
  completedSettlementCount: number;
  recentSettlements: {
    id: string;
    customerName: string;
    treatmentTitle: string;
    treatmentDate: string;
    price: number;
  }[];
};

function isCurrentMonth(date: string) {
  const treatmentDate = new Date(`${date}T00:00:00`);
  const now = new Date();
  return (
    treatmentDate.getFullYear() === now.getFullYear() &&
    treatmentDate.getMonth() === now.getMonth()
  );
}

export function buildDesignerRevenue(treatments: Treatment[]): RevenueSummary {
  const monthTreatments = treatments.filter((treatment) => isCurrentMonth(treatment.treatment_date));
  const priorCustomerIds = new Set(
    treatments
      .filter((treatment) => !isCurrentMonth(treatment.treatment_date))
      .map((treatment) => treatment.customer_id)
      .filter(Boolean),
  );

  const monthCustomerIds = new Set(
    monthTreatments.map((treatment) => treatment.customer_id).filter(Boolean),
  );

  let newCustomerCount = 0;

  for (const customerId of monthCustomerIds) {
    if (customerId && !priorCustomerIds.has(customerId)) {
      newCustomerCount += 1;
    }
  }

  const monthRevenue = monthTreatments
    .filter((treatment) => treatment.payment_status === 'completed')
    .reduce((sum, treatment) => sum + (treatment.price ?? 0), 0);

  const pendingSettlementCount = monthTreatments.filter(
    (treatment) => treatment.payment_status === 'feedback_required',
  ).length;

  const completedSettlementCount = monthTreatments.filter(
    (treatment) => treatment.payment_status === 'completed',
  ).length;

  const recentSettlements = treatments
    .filter((treatment) => treatment.payment_status === 'completed')
    .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))
    .slice(0, 5)
    .map((treatment) => ({
      id: treatment.id,
      customerName: treatment.customer_name || '고객',
      treatmentTitle: treatment.treatment_title,
      treatmentDate: treatment.treatment_date,
      price: treatment.price ?? 0,
    }));

  return {
    monthRevenue,
    monthTreatmentCount: monthTreatments.length,
    newCustomerCount,
    pendingSettlementCount,
    completedSettlementCount,
    recentSettlements,
  };
}
