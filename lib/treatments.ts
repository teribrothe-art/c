import { getCurrentUser, isDemoAuthMode } from './auth';
import { supabase } from './supabase';

export type Treatment = {
  id: string;
  customer_id?: string;
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
  payment_status?: 'pending' | 'feedback_required' | 'completed' | null;
  feedback_completed?: boolean | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  created_at?: string | null;
};

const treatmentSelectFields =
  'id, customer_id, designer_id, designer_name, customer_name, treatment_date, treatment_type, treatment_title, products, technique, damage_level, notes, duration, designer_diagnosis, home_care, ai_insight, price, payment_status, feedback_completed, before_photo_url, after_photo_url, created_at';

const demoTreatments: Treatment[] = [
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
    payment_status: 'feedback_required',
    feedback_completed: false,
  },
  {
    id: 'demo-treatment-2',
    customer_id: 'demo-customer-kim-jiwon',
    designer_id: 'demo-designer-local',
    designer_name: '박정수 디자이너',
    customer_name: '김지원',
    treatment_date: '2026-03-05',
    treatment_type: '커트',
    treatment_title: '레이어드 컷 + 트리트먼트',
    products: ['로레알 트리트먼트'],
    damage_level: 5,
    duration: '1시간 30분',
    designer_diagnosis: '모발 상태 양호. 정기 관리 잘 되고 있음.',
    home_care: '평소 사용 샴푸 유지. 3개월 후 트리트먼트 권장.',
    ai_insight: '컷 주기 6-8주 유지 권장.',
    price: 150000,
    payment_status: 'completed',
    feedback_completed: true,
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
    id: 'demo-treatment-4',
    customer_id: 'demo-customer-park-minji',
    designer_id: 'demo-designer-local',
    designer_name: '디자이너',
    customer_name: '박민지',
    treatment_date: '2026-04-10',
    treatment_type: '펌',
    treatment_title: '매직스트레이트',
    products: ['로레알 펌제'],
    damage_level: 6,
    duration: '4시간',
    designer_diagnosis: '곱슬이 강해 열 보호와 수분 케어가 필요합니다.',
    home_care: '시술 후 48시간 샴푸를 피하고 보습 트리트먼트를 사용하세요.',
    ai_insight: '정산 대기 상태입니다. 피드백 완료 후 정산을 진행하세요.',
    price: 180000,
    payment_status: 'feedback_required',
    feedback_completed: false,
  },
];

export async function getTreatments() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, treatments: [] as Treatment[] };
  }

  if (isDemoAuthMode || !supabase) {
    return { user, treatments: demoTreatments };
  }

  const { data, error } = await supabase
    .from('treatments')
    .select(treatmentSelectFields)
    .or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`)
    .order('treatment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return { user, treatments: (data ?? []) as Treatment[] };
}


export async function getTreatmentById(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, treatment: null as Treatment | null };
  }

  if (isDemoAuthMode || !supabase) {
    return {
      user,
      treatment: demoTreatments.find((treatment) => treatment.id === id) ?? null,
    };
  }

  const { data, error } = await supabase
    .from('treatments')
    .select(treatmentSelectFields)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { user, treatment: data as Treatment | null };
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
    return {
      user,
      treatments: demoTreatments
        .map((treatment) => ({ ...treatment, designer_id: user.id }))
        .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date)),
    };
  }

  const { data, error } = await supabase
    .from('treatments')
    .select(treatmentSelectFields)
    .eq('designer_id', user.id)
    .order('treatment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return { user, treatments: (data ?? []) as Treatment[] };
}


type TreatmentUpdateInput = Partial<
  Pick<
    Treatment,
    | 'technique'
    | 'designer_diagnosis'
    | 'home_care'
    | 'feedback_completed'
    | 'payment_status'
    | 'before_photo_url'
    | 'after_photo_url'
  >
>;

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

    return demoTreatments[index];
  }

  const { data, error } = await supabase
    .from('treatments')
    .update(updates)
    .eq('id', id)
    .eq('designer_id', user.id)
    .select(treatmentSelectFields)
    .single();

  if (error) {
    throw error;
  }

  return data as Treatment;
}
