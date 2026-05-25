import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import type { PaymentStatus } from './payment-status';
import { filterTreatmentsForCustomerUser, sortTreatmentsForDiaryList } from './diary-list';
import { sanitizeTreatmentsForCustomer, sanitizeTreatmentForCustomer } from './treatment-privacy';
import { defaultTreatmentTitle, DEFAULT_TREATMENT_DURATION } from './treatment-options';
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

const INITIAL_DEMO_TREATMENTS: Treatment[] = [
  {
    id: 'demo-treatment-1',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '김미용 디자이너',
    customer_name: '김지원',
    treatment_date: '2026-04-18',
    treatment_type: '탈색',
    treatment_title: '탈색 + 애쉬블루 토닝',
    products: ['웰라 12%', '로레알 디아라이트'],
    damage_level: 7,
    duration: '3시간 20분',
    designer_diagnosis: '손상도 7/10. 한 달간 매직스트레이트 금지. 산성 샴푸 권장.',
    home_care: '주 2회 헤어 마스크. 드라이 온도 낮게.',
    ai_insight: '다음 시술은 6주 후 권장. 모이스처 트리트먼트 우선.',
    price: 250000,
    payment_status: 'payment_requested',
    payment_requested_at: '2026-04-18T12:00:00.000Z',
    feedback_completed: false,
  },
  {
    id: 'demo-treatment-2',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '박정수 디자이너',
    customer_name: '김지원',
    treatment_date: '2026-03-05',
    treatment_type: '컷',
    treatment_title: '레이어드 컷',
    products: ['로레알 트리트먼트'],
    damage_level: 5,
    duration: '1시간 30분',
    designer_diagnosis: '모발 상태 양호. 정기 관리 잘 되고 있음.',
    home_care: '평소 사용 샴푸 유지. 3개월 후 트리트먼트 권장.',
    ai_insight: '컷 주기 6-8주 유지 권장.',
    price: 150000,
    payment_status: 'completed',
    paid_at: '2026-03-05T14:00:00.000Z',
    settled_at: '2026-03-06T10:00:00.000Z',
    platform_fee: 15000,
    designer_payout_amount: 135000,
    feedback_completed: true,
    before_photo_url:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80',
    after_photo_url:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'demo-treatment-3',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '김미용 디자이너',
    customer_name: '김지원',
    treatment_date: '2026-01-22',
    treatment_type: '컬러',
    treatment_title: '애쉬그레이 풀 컬러',
    products: ['로레알 9.1'],
    damage_level: 6,
    duration: '2시간 40분',
    designer_diagnosis: '컬러 시술 후 큐티클 손상. 단백질 보충 필요.',
    home_care: '단백질 트리트먼트 주 1회. 열기구 사용 자제.',
    ai_insight: '컬러 유지 위해 4주 후 토닝 권장.',
    price: 150000,
    payment_status: 'completed',
    feedback_completed: true,
  },
  {
    id: 'demo-treatment-5',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '김미용 디자이너',
    customer_name: '김지원',
    treatment_date: '2025-11-08',
    treatment_type: '펌',
    treatment_title: '볼륨 디지털 펌',
    products: ['아모스 펌제'],
    damage_level: 5,
    duration: '3시간',
    designer_diagnosis: '모근부 볼륨이 잘 살아남. 뿌리 펌 강도는 보통.',
    home_care: '시술 후 48시간 샴푸 금지. 수분 에센스 매일.',
    ai_insight: '펌 유지 3~4개월. 끝머리 트리트먼트 병행 권장.',
    price: 220000,
    payment_status: 'completed',
    paid_at: '2025-11-08T15:00:00.000Z',
    settled_at: '2025-11-09T10:00:00.000Z',
    platform_fee: 22000,
    designer_payout_amount: 198000,
    feedback_completed: true,
  },
  {
    id: 'demo-treatment-6',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '박정수 디자이너',
    customer_name: '김지원',
    treatment_date: '2025-09-14',
    treatment_type: '트리트먼트',
    treatment_title: '단백질 딥 케어',
    products: ['로레알 트리트먼트', '츠바키 마스크'],
    damage_level: 4,
    duration: '1시간',
    designer_diagnosis: '건조함 완화. 큐티클 정돈 양호.',
    home_care: '주 2회 헤어팩. 미온수로 헹굼.',
    ai_insight: '4주 후 두피·모발 점검 추천.',
    price: 80000,
    payment_status: 'completed',
    paid_at: '2025-09-14T11:00:00.000Z',
    settled_at: '2025-09-15T10:00:00.000Z',
    platform_fee: 8000,
    designer_payout_amount: 72000,
    feedback_completed: true,
  },
  {
    id: 'demo-treatment-7',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '김미용 디자이너',
    customer_name: '김지원',
    treatment_date: '2025-06-20',
    treatment_type: '매직',
    treatment_title: '매직스트레이트',
    products: ['밀본 매직제'],
    damage_level: 6,
    duration: '4시간',
    designer_diagnosis: '곱슬 완화. 직경 80% 유지 권장.',
    home_care: '열 차단 필수. 산성 샴푸 사용.',
    ai_insight: '6개월 후 뿌리 리터치 검토.',
    price: 280000,
    payment_status: 'completed',
    paid_at: '2025-06-20T14:00:00.000Z',
    settled_at: '2025-06-21T10:00:00.000Z',
    platform_fee: 28000,
    designer_payout_amount: 252000,
    feedback_completed: true,
  },
  {
    id: 'demo-treatment-4',
    customer_id: 'demo-customer-park-minji',
    designer_id: 'demo-designer-local',
    designer_name: '디자이너',
    customer_name: '박민지',
    treatment_date: '2026-04-10',
    treatment_type: '매직',
    treatment_title: '매직스트레이트',
    products: ['로레알 펌제'],
    damage_level: 6,
    duration: '4시간',
    designer_diagnosis: '곱슬이 강해 열 보호와 수분 케어가 필요합니다.',
    home_care: '시술 후 48시간 샴푸를 피하고 보습 트리트먼트를 사용하세요.',
    ai_insight: '피드백 완료 후 정산 가능합니다.',
    price: 180000,
    payment_status: 'escrow',
    paid_at: '2026-04-10T16:00:00.000Z',
    platform_fee: 18000,
    designer_payout_amount: 162000,
    feedback_completed: false,
    before_photo_url:
      'https://images.unsplash.com/photo-1492106087820-71f1a00d2d11?auto=format&fit=crop&w=900&q=80',
    after_photo_url:
      'https://images.unsplash.com/photo-1521590839637-31813ae3d58c?auto=format&fit=crop&w=900&q=80',
  },
];

const demoTreatments: Treatment[] = INITIAL_DEMO_TREATMENTS.map((item) => ({ ...item }));

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
        demoTreatments.push(...INITIAL_DEMO_TREATMENTS.map((item) => ({ ...item })));
      }

      let merged = false;

      for (const seed of INITIAL_DEMO_TREATMENTS) {
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
    damage_level: input.damageLevel ?? 5,
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
