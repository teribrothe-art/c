/** 디자이너 시술 입력용 두피·모발 제품 프리셋 (카테고리별) */

export type ScalpProductGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: readonly string[];
};

/** 두피·시술 필수 제품 — 카테고리별 정리 */
export const SCALP_PRODUCT_GROUPS: readonly ScalpProductGroup[] = [
  {
    id: 'scalp_cleanse',
    title: '두피 클렌징·스케일링',
    subtitle: '각질·피지 케어, 시술 전 준비',
    items: [
      '두피 딥클렌징 샴푸',
      '클라리파잉 샴푸',
      '스케일링 제 (각질 제거)',
      '씨솔트 두피 스크럽',
      '두피 프리샴푸',
    ],
  },
  {
    id: 'scalp_soothe',
    title: '두피 진정·쿨링',
    subtitle: '민감·가려움·열감 완화',
    items: [
      '두피 진정 토닉',
      '두피 쿨링 앰플',
      '시카 두피 에센스',
      '판테놀 두피 진정제',
      '알로에 두피 미스트',
    ],
  },
  {
    id: 'scalp_nourish',
    title: '두피·뿌리 영양',
    subtitle: '탈모·볼륨·모근 케어',
    items: [
      '두피 영양 앰플',
      '루트 부스팅 에센스',
      '탈모 케어 토닉',
      '펩타이드 두피 세럼',
      '비오틴 두피 앰플',
    ],
  },
  {
    id: 'color_scalp',
    title: '염색·탈색 (두피 보호)',
    subtitle: '컬러 시술 시 두피·모발 보호',
    items: [
      '두피 보호 크림 (바리어)',
      '저자극 산화제 6%',
      '산화제 9%',
      '웰라 블론더/염모제',
      '로레알 디아라이트',
      '토닝 제 (중화·톤)',
      '산성 케어 샴푸 (시술 후)',
    ],
  },
  {
    id: 'perm_magic',
    title: '펌·매직·열처리',
    subtitle: '변성·고정·손상 완화',
    items: [
      '펌 1제 (웨이브)',
      '펌 2제 (중화)',
      '매직 스트레이트 제',
      '열처리 보호제',
      '단백질 충전제 (펌 전)',
      '아모스 펌제',
      '밀본 매직제',
    ],
  },
  {
    id: 'hair_treatment',
    title: '모발 트리트먼트',
    subtitle: '손상 모발 집중 케어',
    items: [
      '단백질 트리트먼트',
      '케라틴 케어',
      '단백질 앰플',
      '츠바키 인텐시브 마스크',
      '로레알 트리트먼트',
      '호호바 헤어 오일',
    ],
  },
  {
    id: 'finish',
    title: '마무리·홈케어 안내용',
    subtitle: '고객에게 추천할 제품 유형',
    items: [
      '홈케어 두피 샴푸',
      '홈케어 두피 토닉',
      '뿌리 볼륨 스프레이',
      '열 보호 스프레이',
      '가벼운 헤어 미스트',
    ],
  },
] as const;

/** 시술 종류별 우선 추천 제품 */
export const SCALP_PRODUCTS_BY_TREATMENT_TYPE: Record<string, readonly string[]> = {
  컷: ['두피 딥클렌징 샴푸', '두피 진정 토닉', '가벼운 헤어 미스트'],
  컬러: [
    '두피 보호 크림 (바리어)',
    '저자극 산화제 6%',
    '로레알 디아라이트',
    '산성 케어 샴푸 (시술 후)',
    '단백질 트리트먼트',
  ],
  펌: ['펌 1제 (웨이브)', '펌 2제 (중화)', '단백질 충전제 (펌 전)', '열처리 보호제'],
  탈색: [
    '두피 보호 크림 (바리어)',
    '토닝 제 (중화·톤)',
    '단백질 트리트먼트',
    '두피 진정 토닉',
  ],
  트리트먼트: [
    '두피 딥클렌징 샴푸',
    '두피 영양 앰플',
    '단백질 트리트먼트',
    '케라틴 케어',
    '홈케어 두피 토닉',
  ],
  매직: ['매직 스트레이트 제', '펌 2제 (중화)', '열처리 보호제', '단백질 트리트먼트'],
};

export function allScalpProductPresets(): string[] {
  const seen = new Set<string>();

  for (const group of SCALP_PRODUCT_GROUPS) {
    for (const item of group.items) {
      seen.add(item);
    }
  }

  return [...seen];
}

export function recommendedScalpProductsForType(treatmentType: string): string[] {
  const key = treatmentType.trim();
  const recommended = SCALP_PRODUCTS_BY_TREATMENT_TYPE[key] ?? [];

  return [...recommended];
}

export function isRecommendedScalpProduct(treatmentType: string, product: string) {
  return recommendedScalpProductsForType(treatmentType).includes(product);
}

/** 시술 상세 빠른 추가용 (브랜드 + 대표 제품) */
export const QUICK_PRODUCT_PRESETS = [
  '웰라',
  '로레알',
  '아모스',
  '밀본',
  '두피 딥클렌징 샴푸',
  '두피 보호 크림 (바리어)',
  '단백질 트리트먼트',
] as const;
