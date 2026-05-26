import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import type { PaymentStatus } from './payment-status';
import { filterTreatmentsForCustomerUser, sortTreatmentsForDiaryList } from './diary-list';
import { sanitizeTreatmentsForCustomer, sanitizeTreatmentForCustomer } from './treatment-privacy';
import { defaultTreatmentTitle, DEFAULT_TREATMENT_DURATION } from './treatment-options';
import { mergeAccumulatedDesignerRelationships } from './demo-accumulated-test-data';
import { INITIAL_DEMO_TREATMENTS } from './demo-initial-treatments';
import { ALL_DEMO_TREATMENT_SEEDS } from './demo-treatment-seeds';
import { supabase } from './supabase';

export type Treatment = {
  id: string;
  customer_id?: string | null;
  designer_id?: string | null;
  designer_name: string | null;
  customer_name?: string | null;
  treatment_date: string;
  treatment_type: string;
  treatment_title: string;
  products: string[] | null;
  technique?: string | null;
  damage_level: number | null;
  notes?: string | null;
  duration?: string | null;
  designer_diagnosis?: string | null;
  home_care?: string | null;
  ai_insight?: string | null;
  price?: number | null;
  payment_status?: PaymentStatus | null;
  feedback_completed?: boolean | null;
  payment_requested_at?: string | null;
  paid_at?: string | null;
  settled_at?: string | null;
  toss_order_id?: string | null;
  toss_payment_key?: string | null;
  platform_fee?: number | null;
  designer_payout_amount?: number | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  created_at?: string | null;
};

const treatmentSelectFields =
  'id, customer_id, designer_id, designer_name, customer_name, treatment_date, treatment_type, treatment_title, products, technique, damage_level, notes, duration, designer_diagnosis, home_care, ai_insight, price, payment_status, feedback_completed, payment_requested_at, paid_at, settled_at, toss_order_id, toss_payment_key, platform_fee, designer_payout_amount, before_photo_url, after_photo_url, created_at';

const DEMO_TREATMENTS_KEY = 'hair-diary-demo-treatments';

const demoTreatments: Treatment[] = (INITIAL_DEMO_TREATMENTS ?? []).map((item) => ({ ...item }));

let demoHydratePromise: Promise<void> | null = null;

async function hydrateDemoTreatments() {
  if (!demoHydratePromise) {
    demoHydratePromise = (async () => {
      const raw = await AsyncStorage.getItem(DEMO_TREATMENTS_KEY);

      if (raw) {
        const stored = JSON.parse(raw) as Treatment[];
        demoTreatments.length = 0;
        demoTreatments.push(...stored);
      } else {
        demoTreatments.length = 0;
        demoTreatments.push(...ALL_DEMO_TREATMENT_SEEDS.map((item) => ({ ...item })));
      }

      let merged = false;

      for (const seed of ALL_DEMO_TREATMENT_SEEDS) {
        const existingIndex = demoTreatments.findIndex((item) => item.id === seed.id);

        if (existingIndex < 0) {
          demoTreatments.push({ ...seed });
          merged = true;
          continue;
        }

        const existing = demoTreatments[existingIndex];
        const patch: Partial<Treatment> = {};

        if (seed.before_photo_url && !existing.before_photo_url) {
          patch.before_photo_url = seed.before_photo_url;
        }

        if (seed.after_photo_url && !existing.after_photo_url) {
          patch.after_photo_url = seed.after_photo_url;
        }

        if (Object.keys(patch).length > 0) {
          demoTreatments[existingIndex] = { ...existing, ...patch };
          merged = true;
        }
      }

      if (!raw || merged) {
        await persistDemoTreatments();
      }

      await mergeAccumulatedDesignerRelationships();
    })();
  }

  await demoHydratePromise;
}

async function persistDemoTreatments() {
  await AsyncStorage.setItem(DEMO_TREATMENTS_KEY, JSON.stringify(demoTreatments));
}

export async function getTreatments() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, treatments: [] as Treatment[] };
  }

  let treatments: Treatment[];

  if (isDemoAuthMode || !supabase) {
    await hydrateDemoTreatments();
    treatments = [...demoTreatments];
  } else {
    const { data, error } = await supabase
      .from('treatments')
      .select(treatmentSelectFields)
      .or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`)
      .order('treatment_date', { ascending: false });

    if (error) {
      throw toAppError(error);
    }

    treatments = (data ?? []) as Treatment[];
  }

  if (user.role === 'customer') {
    const sanitized = sanitizeTreatmentsForCustomer(treatments);
    const mine = sortTreatmentsForDiaryList(filterTreatmentsForCustomerUser(user.id, sanitized));

    return { user, treatments: mine };
  }

  return { user, treatments: sortTreatmentsForDiaryList(treatments) };
}

export async function getTreatmentById(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, treatment: null as Treatment | null };
  }

  let treatment: Treatment | null;

  if (isDemoAuthMode || !supabase) {
    await hydrateDemoTreatments();
    treatment = demoTreatments.find((item) => item.id === id) ?? null;
  } else {
    const { data, error } = await supabase
      .from('treatments')
      .select(treatmentSelectFields)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw toAppError(error);
    }

    treatment = data as Treatment | null;
  }

  if (user.role === 'customer' && treatment) {
    return { user, treatment: sanitizeTreatmentForCustomer(treatment) };
  }

  return { user, treatment };
}

export async function getDesignerTreatments() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, treatments: [] as Treatment[] };
  }

  if (user.role !== 'designer') {
    return { user, treatments: [] as Treatment[] };
  }

  if (isDemoAuthMode || !supabase) {
    await hydrateDemoTreatments();
    return {
      user,
      treatments: demoTreatments
        .filter((treatment) => treatment.designer_id === user.id)
        .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date)),
    };
  }

  const { data, error } = await supabase
    .from('treatments')
    .select(treatmentSelectFields)
    .eq('designer_id', user.id)
    .order('treatment_date', { ascending: false });

  if (error) {
    throw toAppError(error);
  }

  return { user, treatments: (data ?? []) as Treatment[] };
}

export type CreateDesignerTreatmentInput = {
  customerName: string;
  treatmentType: string;
  treatmentTitle?: string;
  price?: number;
  damageLevel?: number;
  duration?: string;
  products?: string[];
};

export type TreatmentUpdateInput = Partial<
  Pick<
    Treatment,
    | 'customer_id'
    | 'customer_name'
    | 'technique'
    | 'designer_diagnosis'
    | 'home_care'
    | 'ai_insight'
    | 'feedback_completed'
    | 'payment_status'
    | 'payment_requested_at'
    | 'paid_at'
    | 'settled_at'
    | 'toss_order_id'
    | 'toss_payment_key'
    | 'platform_fee'
    | 'designer_payout_amount'
    | 'before_photo_url'
    | 'after_photo_url'
    | 'price'
    | 'duration'
    | 'damage_level'
    | 'treatment_type'
    | 'treatment_title'
    | 'products'
  >
>;

export async function createDesignerTreatment(input: CreateDesignerTreatmentInput) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 시술을 등록할 수 있습니다.');
  }

  const customerName = input.customerName.trim();

  if (!customerName) {
    throw new Error('고객 이름을 입력해주세요.');
  }

  const treatmentType = input.treatmentType.trim();

  if (!treatmentType) {
    throw new Error('시술 종류를 선택해주세요.');
  }

  const treatmentTitle = input.treatmentTitle?.trim() || defaultTreatmentTitle(treatmentType);
  const treatmentDate = new Date().toISOString().slice(0, 10);
  const price = input.price && input.price > 0 ? Math.round(input.price) : null;
  const products =
    input.products?.map((item) => item.trim()).filter(Boolean).length
      ? input.products.map((item) => item.trim()).filter(Boolean)
      : null;

  const baseRow = {
    customer_id: null as string | null,
    designer_id: user.id,
    designer_name: '디자이너',
    customer_name: customerName,
    treatment_date: treatmentDate,
    treatment_type: treatmentType,
    treatment_title: treatmentTitle,
    products,
    technique: null as string | null,
    damage_level:
      input.damageLevel && input.damageLevel > 0 ? Math.round(input.damageLevel) : null,
    duration: input.duration?.trim() || DEFAULT_TREATMENT_DURATION,
    designer_diagnosis: null as string | null,
    home_care: null as string | null,
    ai_insight: null as string | null,
    price,
    payment_status: 'pending' as const,
    feedback_completed: false,
  };

  if (isDemoAuthMode || !supabase) {
    await hydrateDemoTreatments();

    const usersRaw = await AsyncStorage.getItem('hair-diary-demo-users');
    const users = usersRaw ? (JSON.parse(usersRaw) as { id: string; name: string | null }[]) : [];
    const designerName = users.find((item) => item.id === user.id)?.name ?? '디자이너';

    const treatment: Treatment = {
      id: `demo-treatment-${Date.now()}`,
      ...baseRow,
      designer_name: designerName,
      created_at: new Date().toISOString(),
    };

    demoTreatments.unshift(treatment);
    await persistDemoTreatments();

    return treatment;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('treatments')
    .insert({
      ...baseRow,
      designer_name: profile?.name?.trim() || '디자이너',
    })
    .select(treatmentSelectFields)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as Treatment;
}

export async function updateTreatment(id: string, updates: TreatmentUpdateInput) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  if (isDemoAuthMode || !supabase) {
    const index = demoTreatments.findIndex((treatment) => treatment.id === id);

    if (index < 0) {
      throw new Error('시술 기록을 찾을 수 없습니다.');
    }

    demoTreatments[index] = {
      ...demoTreatments[index],
      ...updates,
    };

    await persistDemoTreatments();

    return demoTreatments[index];
  }

  let query = supabase.from('treatments').update(updates).eq('id', id);

  if (user.role === 'designer') {
    query = query.eq('designer_id', user.id);
  } else {
    query = query.eq('customer_id', user.id);
  }

  const { data, error } = await query.select(treatmentSelectFields).single();

  if (error) {
    throw toAppError(error);
  }

  return data as Treatment;
}
