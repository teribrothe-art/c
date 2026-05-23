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
  duration?: string | null;
  designer_diagnosis?: string | null;
  home_care?: string | null;
  ai_insight?: string | null;
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
    duration: '3시간 30분',
    designer_diagnosis: '이전 탈색 이력으로 모발 끝 손상이 높은 편입니다.',
    home_care: '보색 샴푸는 주 2회, 열기구 사용 전 에센스를 권장합니다.',
    ai_insight: '2주 뒤 컬러 빠짐 체크와 단백질 케어를 추천해요.',
  },
  {
    id: 'demo-treatment-2',
    designer_name: '박정수 디자이너',
    treatment_date: '2026-03-05',
    treatment_type: '커트',
    treatment_title: '레이어드 컷 + 트리트먼트',
    products: ['로레알 트리트먼트'],
    damage_level: 5,
    duration: '1시간',
    designer_diagnosis: '층을 정리해 무게감을 줄이면 컬 유지가 쉬워집니다.',
    home_care: '드라이 전 볼륨 무스를 소량 사용해보세요.',
    ai_insight: '6주 뒤 라인 정리를 예약하면 스타일 유지에 좋아요.',
  },
  {
    id: 'demo-treatment-3',
    designer_name: '김미용 디자이너',
    treatment_date: '2026-01-22',
    treatment_type: '컬러',
    treatment_title: '애쉬그레이 풀 컬러',
    products: ['로레알 9.1'],
    damage_level: 6,
    duration: '2시간 30분',
    designer_diagnosis: '붉은 기가 남아 애쉬 계열 보정이 필요했습니다.',
    home_care: '컬러 전용 샴푸와 찬물 헹굼을 추천합니다.',
    ai_insight: '다음 컬러 전 4주간 집중 보습 케어를 해주세요.',
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
      'id, customer_id, designer_id, designer_name, treatment_date, treatment_type, treatment_title, products, damage_level, notes, duration, designer_diagnosis, home_care, ai_insight, created_at',
    )
    .or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`)
    .order('treatment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return { user, treatments: (data ?? []) as Treatment[] };
}
