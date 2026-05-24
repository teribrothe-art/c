import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage, toAppError } from './errors';

import { getCurrentUser, isDemoAuthMode, UserRole } from './auth';
import { fetchDesignerProfilePaymentStats } from './designer-payment-stats';
import { supabase } from './supabase';
import { getDesignerTreatments, getTreatments, Treatment } from './treatments';

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
  designerCount: number;
};

export type DesignerStats = {
  kind: 'designer';
  treatmentCount: number;
  totalSettlementAmount: number;
  monthSettlementAmount: number;
  pendingSettlementCount: number;
  regularCustomerCount: number;
};

export type ProfileStats = CustomerStats | DesignerStats;

function computeCustomerStats(treatments: Treatment[]): CustomerStats {
  const designerIds = new Set<string>();

  for (const treatment of treatments) {
    if (treatment.designer_id) {
      designerIds.add(treatment.designer_id);
    }
  }

  const latestTreatmentDate =
    treatments.length > 0
      ? treatments.reduce((latest, treatment) =>
          treatment.treatment_date > latest ? treatment.treatment_date : latest,
        treatments[0].treatment_date)
      : null;

  return {
    kind: 'customer',
    treatmentCount: treatments.length,
    latestTreatmentDate,
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
    totalSettlementAmount: 0,
    monthSettlementAmount: 0,
    pendingSettlementCount: 0,
    regularCustomerCount: customerIds.size,
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
    const { treatments } = await getDesignerTreatments();
    const base = computeDesignerStatsFromTreatments(treatments);
    const paymentStats = await fetchDesignerProfilePaymentStats();

    return {
      profile,
      stats: {
        kind: 'designer' as const,
        ...base,
        totalSettlementAmount: paymentStats.totalSettlementAmount,
        monthSettlementAmount: paymentStats.monthSettlementAmount,
        pendingSettlementCount: paymentStats.pendingSettlementCount,
      },
    };
  }

  const { treatments } = await getTreatments();
  return {
    profile,
    stats: computeCustomerStats(treatments),
  };
}
