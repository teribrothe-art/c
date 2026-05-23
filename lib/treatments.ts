import { getCurrentUser, isDemoAuthMode } from './auth';
import { supabase } from './supabase';

export type Treatment = {
  id: string;
  customer_id?: string;
  designer_id?: string | null;
  designer_name: string | null;
  treatment_date: string;
  treatment_type: string;
  treatment_title: string;
  products: string[] | null;
  damage_level: number | null;
  notes?: string | null;
  created_at?: string | null;
};

const demoTreatments: Treatment[] = [
  {
    id: 'demo-treatment-1',
    designer_name: '김미용 디자이너',
    treatment_date: '2026-04-18',
    treatment_type: '탈색',
    treatment_title: '탈색 + 애쉬블루 토닝',
    products: ['웰라 12%', '로레알 디아라이트'],
    damage_level: 7,
  },
  {
    id: 'demo-treatment-2',
    designer_name: '박정수 디자이너',
    treatment_date: '2026-03-05',
    treatment_type: '커트',
    treatment_title: '레이어드 컷 + 트리트먼트',
    products: ['로레알 트리트먼트'],
    damage_level: 5,
  },
  {
    id: 'demo-treatment-3',
    designer_name: '김미용 디자이너',
    treatment_date: '2026-01-22',
    treatment_type: '컬러',
    treatment_title: '애쉬그레이 풀 컬러',
    products: ['로레알 9.1'],
    damage_level: 6,
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
    .select(
      'id, customer_id, designer_id, designer_name, treatment_date, treatment_type, treatment_title, products, damage_level, notes, created_at',
    )
    .or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`)
    .order('treatment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return { user, treatments: (data ?? []) as Treatment[] };
}
