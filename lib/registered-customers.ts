import { getCurrentUser, isDemoAuthMode } from './auth';
import { demoGetItem, demoSetItem } from './demo-async-storage';
import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import { getLinkedCustomersForDesigner } from './demo-designer-linked-customers';
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

export type SearchRegisteredCustomersOptions = {
  designerId?: string;
};

/** 테스트·데모 디자이너 ID — Supabase RPC 대신 로컬 시드 검색 */
export function isDemoCatalogDesignerId(designerId: string) {
  return (
    designerId === 'demo-designer-local' ||
    /^beta-designer-\d+$/.test(designerId) ||
    /^test-designer-/.test(designerId) ||
    /^test-fleet-\d+$/.test(designerId)
  );
}

type StoredDemoUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

type DemoRelationship = {
  designer_id: string;
  customer_id: string;
};

async function readDemoRelationships(): Promise<DemoRelationship[]> {
  const raw = await demoGetItem(DEMO_RELATIONSHIPS_KEY);
  return raw ? (JSON.parse(raw) as DemoRelationship[]) : [];
}

async function writeDemoRelationships(items: DemoRelationship[]) {
  await demoSetItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
}

export async function ensureDesignerCustomerRelationship(designerId: string, customerId: string) {
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

function normalizeCustomerSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function matchesCustomerSearch(item: RegisteredCustomerOption, query: string) {
  const normalizedQuery = normalizeCustomerSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const name = normalizeCustomerSearchText(item.name);
  const email = item.email.trim().toLowerCase();

  return name.includes(normalizedQuery) || email.includes(normalizedQuery);
}

async function appendTreatmentLinkedCustomers(
  designerId: string,
  merged: Map<string, RegisteredCustomerOption>,
) {
  const { listTreatmentsForDesignerId } = await import('./treatments');
  const treatments = await listTreatmentsForDesignerId(designerId);

  for (const treatment of treatments) {
    if (!treatment.customer_id) {
      continue;
    }

    const existing = merged.get(treatment.customer_id);
    const name = treatment.customer_name?.trim() || existing?.name || '고객';

    merged.set(treatment.customer_id, {
      id: treatment.customer_id,
      name,
      email: existing?.email ?? '',
      linked: existing?.linked ?? false,
    });
  }
}

async function readStoredDemoCustomers(): Promise<StoredDemoUser[]> {
  const usersRaw = await demoGetItem('hair-diary-demo-users');
  const stored = usersRaw ? (JSON.parse(usersRaw) as StoredDemoUser[]) : [];

  return stored.filter((account) => account.role === 'customer');
}

async function fetchDemoRegisteredCustomers(
  designerId: string,
  query: string,
): Promise<RegisteredCustomerOption[]> {
  const merged = new Map<string, RegisteredCustomerOption>();
  const storedCustomers = await readStoredDemoCustomers();

  for (const customer of getLinkedCustomersForDesigner(designerId)) {
    merged.set(customer.id, {
      id: customer.id,
      name: customer.name?.trim() || '고객',
      email: customer.email,
      linked: false,
    });
  }

  for (const account of storedCustomers) {
    merged.set(account.id, {
      id: account.id,
      name: account.name?.trim() || '고객',
      email: account.email,
      linked: false,
    });
  }

  const betaDesignerIndex = BETA_DESIGNERS.findIndex((designer) => designer.id === designerId);

  if (betaDesignerIndex >= 0) {
    const betaCustomer = BETA_CUSTOMERS[betaDesignerIndex];

    if (betaCustomer) {
      merged.set(betaCustomer.id, {
        id: betaCustomer.id,
        name: betaCustomer.name,
        email: betaCustomer.email,
        linked: false,
      });
    }
  }

  try {
    await appendTreatmentLinkedCustomers(designerId, merged);
  } catch (error) {
    console.warn('[registered-customers] appendTreatmentLinkedCustomers failed', error);
  }

  const relationships = await readDemoRelationships();
  const linkedIds = new Set(
    relationships.filter((item) => item.designer_id === designerId).map((item) => item.customer_id),
  );

  for (const customerId of linkedIds) {
    if (merged.has(customerId)) {
      continue;
    }

    const storedCustomer = storedCustomers.find((item) => item.id === customerId);

    if (storedCustomer) {
      merged.set(customerId, {
        id: customerId,
        name: storedCustomer.name?.trim() || '고객',
        email: storedCustomer.email,
        linked: false,
      });
    }
  }

  return [...merged.values()]
    .map((item) => ({
      ...item,
      linked: linkedIds.has(item.id),
    }))
    .filter((item) => matchesCustomerSearch(item, query))
    .sort((a, b) => Number(b.linked) - Number(a.linked) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 40);
}

function canDesignerSearchCustomers(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  designerId: string,
) {
  if (!user || user.id !== designerId) {
    return false;
  }

  if (user.role === 'designer') {
    return true;
  }

  return !user.role && isDemoCatalogDesignerId(designerId);
}

/** 디자이너: 가입 고객 검색 (이름·이메일) */
export async function searchRegisteredCustomers(
  query = '',
  options: SearchRegisteredCustomersOptions = {},
): Promise<RegisteredCustomerOption[]> {
  const user = await getCurrentUser();
  const designerId = options.designerId?.trim() || user?.id;

  if (!designerId || !canDesignerSearchCustomers(user, designerId)) {
    return [];
  }

  if (isDemoAuthMode || !supabase || isDemoCatalogDesignerId(designerId)) {
    return fetchDemoRegisteredCustomers(designerId, query);
  }

  const { data, error } = await supabase.rpc('search_registered_customers', {
    p_query: query.trim(),
    p_limit: 40,
  });

  if (error) {
    if (error.message.includes('Could not find the function')) {
      return fetchDemoRegisteredCustomers(designerId, query);
    }

    throw toAppError(error);
  }

  const rows = (data ?? []) as { id: string; name: string; email: string; linked: boolean }[];

  if (rows.length === 0) {
    return fetchDemoRegisteredCustomers(designerId, query);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name?.trim() || '고객',
    email: row.email?.trim() || '',
    linked: Boolean(row.linked),
  }));
}

async function fetchCustomerProfile(customerId: string, designerId?: string) {
  if (isDemoAuthMode || !supabase) {
    const user = await getCurrentUser();
    const customers = await fetchDemoRegisteredCustomers(designerId ?? user?.id ?? '', '');
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

  const profile = await fetchCustomerProfile(customerId, user.id);

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
