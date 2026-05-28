import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage, toAppError } from './errors';

import { getCurrentUser, isDemoAuthMode, UserRole } from './auth';
import {
  fetchDesignerProfilePaymentStats,
  type MonthlySettlementTotal,
  SettlementListItem,
} from './designer-payment-stats';
import { supabase } from './supabase';
import { fetchDesignerLedger } from './services/designer-ledger-service';
import { getTreatments, Treatment } from './treatments';

const DEMO_USERS_KEY = 'hair-diary-demo-users';

export type ProfileData = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type CustomerStats = {
  kind: 'customer';
  treatmentCount: number;
  latestTreatmentDate: string | null;
  latestTreatmentId: string | null;
  designerCount: number;
};

export type DesignerStats = {
  kind: 'designer';
  treatmentCount: number;
  monthTreatmentCount: number;
  totalSettlementAmount: number;
  monthSettlementAmount: number;
  monthlySettlementTotals: MonthlySettlementTotal[];
  pendingSettlementCount: number;
  regularCustomerCount: number;
  recentSettlements: SettlementListItem[];
};

function isCurrentMonthTreatmentDate(treatmentDate: string) {
  const now = new Date();
  const date = new Date(`${treatmentDate}T00:00:00`);

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export type ProfileStats = CustomerStats | DesignerStats;

function computeCustomerStats(treatments: Treatment[]): CustomerStats {
  const designerIds = new Set<string>();

  for (const treatment of treatments) {
    if (treatment.designer_id) {
      designerIds.add(treatment.designer_id);
    }
  }

  const latestTreatment =
    treatments.length > 0
      ? treatments.reduce((latest, treatment) =>
          treatment.treatment_date > latest.treatment_date ? treatment : latest,
        )
      : null;

  return {
    kind: 'customer',
    treatmentCount: treatments.length,
    latestTreatmentDate: latestTreatment?.treatment_date ?? null,
    latestTreatmentId: latestTreatment?.id ?? null,
    designerCount: designerIds.size,
  };
}

function computeDesignerStatsFromTreatments(treatments: Treatment[]): Omit<DesignerStats, 'kind'> {
  const customerIds = new Set<string>();

  for (const treatment of treatments) {
    if (treatment.customer_id) {
      customerIds.add(treatment.customer_id);
    }
  }

  return {
    treatmentCount: treatments.length,
    monthTreatmentCount: treatments.filter((treatment) =>
      isCurrentMonthTreatmentDate(treatment.treatment_date),
    ).length,
    totalSettlementAmount: 0,
    monthSettlementAmount: 0,
    monthlySettlementTotals: [],
    pendingSettlementCount: 0,
    regularCustomerCount: customerIds.size,
    recentSettlements: [],
  };
}

async function fetchProfileDetails(userId: string, email: string, role: UserRole): Promise<ProfileData> {
  if (isDemoAuthMode || !supabase) {
    const rawUsers = await AsyncStorage.getItem(DEMO_USERS_KEY);
    const users = rawUsers ? (JSON.parse(rawUsers) as { id: string; email: string; name: string | null; role: UserRole }[]) : [];
    const demoUser = users.find((item) => item.id === userId);

    return {
      id: userId,
      email: demoUser?.email ?? email,
      name: demoUser?.name ?? null,
      role: demoUser?.role ?? role,
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  if (!data) {
    return { id: userId, email, name: null, role };
  }

  return {
    id: data.id,
    email: data.email ?? email,
    name: data.name,
    role: data.role as UserRole,
  };
}

export async function getProfileScreenData() {
  const user = await getCurrentUser();

  if (!user?.role) {
    return null;
  }

  const profile = await fetchProfileDetails(user.id, user.email, user.role);

  if (user.role === 'designer') {
    const ledger = await fetchDesignerLedger();
    const treatments = ledger?.treatments ?? [];
    const base = computeDesignerStatsFromTreatments(treatments);
    const paymentStats = await fetchDesignerProfilePaymentStats();

    return {
      profile,
      stats: {
        kind: 'designer' as const,
        ...base,
        totalSettlementAmount: paymentStats.totalSettlementAmount,
        monthSettlementAmount: paymentStats.monthSettlementAmount,
        monthlySettlementTotals: paymentStats.monthlySettlementTotals,
        pendingSettlementCount: paymentStats.pendingSettlementCount,
        recentSettlements: paymentStats.recentSettlements,
      },
    };
  }

  const { treatments } = await getTreatments();
  return {
    profile,
    stats: computeCustomerStats(treatments),
  };
}
