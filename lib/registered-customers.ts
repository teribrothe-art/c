import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { BETA_CUSTOMERS } from './beta-test-accounts';
import { expireInvitation, getPendingInvitationForTreatment } from './customer-invitations';
import { toAppError } from './errors';
import { addNotification } from './notifications';
import { supabase } from './supabase';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

export type RegisteredCustomerOption = {
  id: string;
  name: string;
  email: string;
  linked: boolean;
};

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

type DemoRelationship = {
  designer_id: string;
  customer_id: string;
};

async function readDemoRelationships(): Promise<DemoRelationship[]> {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  return raw ? (JSON.parse(raw) as DemoRelationship[]) : [];
}

async function writeDemoRelationships(items: DemoRelationship[]) {
  await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
}

async function ensureDesignerCustomerRelationship(designerId: string, customerId: string) {
  if (isDemoAuthMode || !supabase) {
    const items = await readDemoRelationships();

    if (!items.some((item) => item.designer_id === designerId && item.customer_id === customerId)) {
      items.push({ designer_id: designerId, customer_id: customerId });
      await writeDemoRelationships(items);
    }

    return;
  }

  const { error } = await supabase.from('designer_customer_relationships').upsert(
    {
      designer_id: designerId,
      customer_id: customerId,
      status: 'active',
    },
    { onConflict: 'designer_id,customer_id' },
  );

  if (error) {
    throw toAppError(error);
  }
}

async function fetchDemoRegisteredCustomers(
  designerId: string,
  query: string,
): Promise<RegisteredCustomerOption[]> {
  const usersRaw = await AsyncStorage.getItem('hair-diary-demo-users');
  const stored = usersRaw
    ? (JSON.parse(usersRaw) as { id: string; email: string; name: string | null; role: string }[])
    : [];

  const merged = new Map<string, RegisteredCustomerOption>();

  for (const account of BETA_CUSTOMERS) {
    merged.set(account.id, {
      id: account.id,
      name: account.name,
      email: account.email,
      linked: false,
    });
  }

  for (const account of stored) {
    if (account.role !== 'customer') {
      continue;
    }

    merged.set(account.id, {
      id: account.id,
      name: account.name?.trim() || '고객',
      email: account.email,
      linked: false,
    });
  }

  merged.set('demo-customer-kim-jiwon', {
    id: 'demo-customer-kim-jiwon',
    name: '김지원',
    email: 'demo@hair.app',
    linked: false,
  });

  merged.set('demo-customer-park-minji', {
    id: 'demo-customer-park-minji',
    name: '박민지',
    email: 'demo2@hair.app',
    linked: false,
  });

  const relationships = await readDemoRelationships();
  const linkedIds = new Set(
    relationships.filter((item) => item.designer_id === designerId).map((item) => item.customer_id),
  );

  const normalizedQuery = query.trim().toLowerCase();

  return [...merged.values()]
    .map((item) => ({
      ...item,
      linked: linkedIds.has(item.id),
    }))
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.email.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => Number(b.linked) - Number(a.linked) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 40);
}

/** 디자이너: 가입 고객 검색 (이름·이메일) */
export async function searchRegisteredCustomers(query = ''): Promise<RegisteredCustomerOption[]> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return [];
  }

  if (isDemoAuthMode || !supabase) {
    return fetchDemoRegisteredCustomers(user.id, query);
  }

  const { data, error } = await supabase.rpc('search_registered_customers', {
    p_query: query.trim(),
    p_limit: 40,
  });

  if (error) {
    const message = error.message ?? '';

    if (
      message.includes('Could not find the function') ||
      message.includes('search_registered_customers') ||
      message.includes('NOT_AUTHENTICATED') ||
      message.includes('permission denied')
    ) {
      return fetchDemoRegisteredCustomers(user.id, query);
    }

    throw toAppError(error);
  }

  return (data ?? []).map((row: { id: string; name: string; email: string; linked: boolean }) => ({
    id: row.id,
    name: row.name?.trim() || '고객',
    email: row.email?.trim() || '',
    linked: Boolean(row.linked),
  }));
}

async function fetchCustomerProfile(customerId: string) {
  if (isDemoAuthMode || !supabase) {
    const user = await getCurrentUser();
    const customers = await fetchDemoRegisteredCustomers(user?.id ?? '', '');
    const match = customers.find((item) => item.id === customerId);

    if (!match) {
      throw new Error('고객 계정을 찾을 수 없습니다.');
    }

    return { id: match.id, name: match.name, email: match.email, role: 'customer' as const };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', customerId)
    .eq('role', 'customer')
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  if (!data) {
    throw new Error('고객 계정을 찾을 수 없습니다.');
  }

  return data;
}

/** 시술 기록에 가입 고객 연결 (초대 코드 없이) */
export async function linkRegisteredCustomerToTreatment(treatmentId: string, customerId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 고객을 연결할 수 있습니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment || treatment.designer_id !== user.id) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  if (treatment.customer_id) {
    throw new Error('이미 연결된 고객이 있습니다.');
  }

  const profile = await fetchCustomerProfile(customerId);

  if (isDemoAuthMode || !supabase) {
    const updated = await updateTreatment(treatmentId, {
      customer_id: customerId,
      customer_name: profile.name?.trim() || treatment.customer_name,
    });

    await ensureDesignerCustomerRelationship(user.id, customerId);

    const pending = await getPendingInvitationForTreatment(treatmentId);

    if (pending) {
      await expireInvitation(pending.id);
    }

    await addNotification({
      user_id: customerId,
      type: 'treatment_recorded',
      title: '시술 기록',
      message: `${treatment.treatment_title} 시술이 다이어리에 추가됐어요.`,
      treatment_id: treatmentId,
      href: `/treatment/${treatmentId}`,
    });

    await addNotification({
      user_id: user.id,
      type: 'invite_customer_joined',
      title: '고객 연결',
      message: `✓ ${profile.name ?? '고객'}님과 연결됐어요.`,
      treatment_id: treatmentId,
      href: '/designer/clients',
    });

    return updated;
  }

  const { error: rpcError } = await supabase.rpc('link_customer_to_treatment', {
    p_treatment_id: treatmentId,
    p_customer_id: customerId,
  });

  if (rpcError) {
    if (rpcError.message.includes('Could not find the function')) {
      const updated = await updateTreatment(treatmentId, {
        customer_id: customerId,
        customer_name: profile.name?.trim() || treatment.customer_name,
      });

      await ensureDesignerCustomerRelationship(user.id, customerId);

      const pending = await getPendingInvitationForTreatment(treatmentId);

      if (pending) {
        await expireInvitation(pending.id);
      }

      await addNotification({
        user_id: customerId,
        type: 'treatment_recorded',
        title: '시술 기록',
        message: `${treatment.treatment_title} 시술이 다이어리에 추가됐어요.`,
        treatment_id: treatmentId,
        href: `/treatment/${treatmentId}`,
      });

      return updated;
    }

    throw toAppError(rpcError);
  }

  const updated = await getTreatmentById(treatmentId);

  return updated.treatment as Treatment;
}
