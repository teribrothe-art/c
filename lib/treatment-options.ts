import { QUICK_PRODUCT_PRESETS } from './scalp-product-presets';

export type TreatmentTypeOption = {
  icon: string;
  label: string;
};

export const TREATMENT_TYPE_OPTIONS: TreatmentTypeOption[] = [
  { icon: '✂️', label: '컷' },
  { icon: '🎨', label: '컬러' },
  { icon: '💫', label: '펌' },
  { icon: '✨', label: '탈색' },
  { icon: '💧', label: '트리트먼트' },
  { icon: '🪄', label: '매직' },
];

export const DURATION_OPTIONS = [
  '30분',
  '1시간',
  '1시간 30분',
  '2시간',
  '2시간 30분',
  '3시간',
  '3시간 30분',
  '4시간',
  '4시간 이상',
] as const;

export const TREATMENT_TITLE_PRESETS: Record<string, string[]> = {
  컷: ['레이어드 컷', '일반 컷', '앞머리 컷'],
  컬러: ['풀 컬러', '뿌리 염색', '톤 다운'],
  펌: ['디지털 펌', '볼륨 펌', '매직스트레이트'],
  탈색: ['탈색 + 토닝', '브리칭', '탈색'],
  트리트먼트: ['단백질 트리트먼트', '케라틴 케어', '두피 케어'],
  매직: ['매직', '셋팅 펌', '스트레이트'],
};

export const PRODUCT_PRESETS = [...QUICK_PRODUCT_PRESETS] as const;

export const DEFAULT_TREATMENT_DURATION = '1시간 30분';

export function defaultTreatmentTitle(type: string) {
  const trimmed = type.trim();
  return trimmed ? `${trimmed} 시술` : '시술';
}

export function parseProductsInput(text: string) {
  return text
    .split(/[,·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatProductsInput(products: string[] | null | undefined) {
  return products?.length ? products.join(' · ') : '';
}

export function titlePresetsForType(type: string) {
  return TREATMENT_TITLE_PRESETS[type] ?? [];
}
