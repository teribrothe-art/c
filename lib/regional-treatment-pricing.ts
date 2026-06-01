/**
 * 지역별 시술 평균가 (2025~2026년 국내 미용실 시장 참고)
 *
 * - 서울 평균 커트 1.1~2.1만원, 강남 프리미엄 4.4~10만원+ (redpenny 2023, o2u 2025)
 * - 펌 5~15만원, 염색 6~20만원 (지역·샵 등급별, o2u 2025)
 * - 플랜비는 중상위 프리미엄 샵 기준으로 설정
 */

export type TreatmentTemplate = {
  type: string;
  title: string;
  price: number;
  duration: string;
  weight: number;
};

export type RegionalPriceProfile = {
  key: string;
  label: string;
  /** 시장 조사 출처 요약 */
  sourceNote: string;
  templates: TreatmentTemplate[];
};

const PROFILES: Record<string, RegionalPriceProfile> = {
  'seoul-premium': {
    key: 'seoul-premium',
    label: '서울 강남·서초 프리미엄',
    sourceNote: '강남·청담·압구정 중상위 샵 (커트 3.5~4.5만, 펌·염색 12~18만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 45000, duration: '1시간 20분', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 150000, duration: '2시간 30분', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 140000, duration: '3시간', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 180000, duration: '4시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 85000, duration: '1시간', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 95000, duration: '1시간', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 180000, duration: '3시간 40분', weight: 8 },
    ],
  },
  seoul: {
    key: 'seoul',
    label: '서울',
    sourceNote: '서울 평균·홍대·성수·송파 (커트 2.5~3.5만, 펌 9~12만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 35000, duration: '1시간 20분', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 120000, duration: '2시간 30분', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 110000, duration: '3시간', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 150000, duration: '4시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 70000, duration: '1시간', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 80000, duration: '1시간', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 150000, duration: '3시간 40분', weight: 8 },
    ],
  },
  gyeonggi: {
    key: 'gyeonggi',
    label: '경기·인천',
    sourceNote: '판교·분당·수원·인천 (커트 2~2.8만, 펌 7~10만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 28000, duration: '1시간 10분', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 95000, duration: '2시간 20분', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 90000, duration: '2시간 50분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 120000, duration: '3시간 30분', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 60000, duration: '1시간', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 70000, duration: '1시간', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 120000, duration: '3시간 20분', weight: 8 },
    ],
  },
  busan: {
    key: 'busan',
    label: '부산·울산·경남',
    sourceNote: '해운대·서면·창원 (커트 2~2.5만, 펌 6.5~9만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 25000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 85000, duration: '2시간 10분', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 80000, duration: '2시간 40분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 110000, duration: '3시간 20분', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 55000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 65000, duration: '50분', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 110000, duration: '3시간', weight: 8 },
    ],
  },
  daegu: {
    key: 'daegu',
    label: '대구·경북',
    sourceNote: '동성로·수성·포항 (커트 2~2.4만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 24000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 80000, duration: '2시간', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 75000, duration: '2시간 30분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 105000, duration: '3시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 50000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 60000, duration: '50분', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 105000, duration: '3시간', weight: 8 },
    ],
  },
  chungcheong: {
    key: 'chungcheong',
    label: '대전·세종·충청',
    sourceNote: '둔산·유성·천안 (커트 2~2.4만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 24000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 82000, duration: '2시간', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 78000, duration: '2시간 30분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 108000, duration: '3시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 52000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 62000, duration: '50분', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 108000, duration: '3시간', weight: 8 },
    ],
  },
  jeolla: {
    key: 'jeolla',
    label: '광주·전라',
    sourceNote: '충장로·전주·여수 (커트 2~2.3만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 23000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 78000, duration: '2시간', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 72000, duration: '2시간 20분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 100000, duration: '3시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 48000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 58000, duration: '50분', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 100000, duration: '3시간', weight: 8 },
    ],
  },
  gangwon: {
    key: 'gangwon',
    label: '강원·제주',
    sourceNote: '춘천·강릉·제주 (관광·상권 프리미엄 반영)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 26000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 88000, duration: '2시간 10분', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 82000, duration: '2시간 40분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 115000, duration: '3시간 20분', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 55000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 68000, duration: '1시간', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 115000, duration: '3시간', weight: 8 },
    ],
  },
  default: {
    key: 'default',
    label: '전국 기본',
    sourceNote: '지방·중소도시 평균 (커트 1.5~2.2만)',
    templates: [
      { type: '컷', title: '레이어드 컷', price: 22000, duration: '1시간', weight: 28 },
      { type: '컬러', title: '애쉬브라운 컬러', price: 75000, duration: '2시간', weight: 18 },
      { type: '펌', title: '볼륨 디지털 펌', price: 70000, duration: '2시간 20분', weight: 14 },
      { type: '매직', title: '매직스트레이트', price: 95000, duration: '3시간', weight: 10 },
      { type: '트리트먼트', title: '단백질 딥 케어', price: 45000, duration: '50분', weight: 16 },
      { type: '스파', title: '헤드 스파', price: 55000, duration: '50분', weight: 14 },
      { type: '탈색', title: '탈색 + 톤다운', price: 95000, duration: '3시간', weight: 8 },
    ],
  },
};

/** 매장 region 문자열 → 가격 프로필 키 */
export function resolveRegionalPriceKey(region: string): keyof typeof PROFILES {
  const normalized = region.trim();

  if (normalized.includes('서울') && (normalized.includes('강남') || normalized.includes('서초'))) {
    return 'seoul-premium';
  }

  if (normalized.startsWith('서울')) {
    return 'seoul';
  }

  if (normalized.includes('경기') || normalized.includes('인천')) {
    return 'gyeonggi';
  }

  if (
    normalized.includes('부산') ||
    normalized.includes('울산') ||
    normalized.includes('경남') ||
    normalized.includes('해운대')
  ) {
    return 'busan';
  }

  if (normalized.includes('대구') || normalized.includes('경북') || normalized.includes('포항')) {
    return 'daegu';
  }

  if (
    normalized.includes('대전') ||
    normalized.includes('세종') ||
    normalized.includes('충청') ||
    normalized.includes('충남') ||
    normalized.includes('충북')
  ) {
    return 'chungcheong';
  }

  if (normalized.includes('광주') || normalized.includes('전라') || normalized.includes('전북')) {
    return 'jeolla';
  }

  if (normalized.includes('강원') || normalized.includes('제주')) {
    return 'gangwon';
  }

  return 'default';
}

export function getRegionalPriceProfile(region: string): RegionalPriceProfile {
  return PROFILES[resolveRegionalPriceKey(region)] ?? PROFILES.default;
}

export function getTreatmentTemplatesForRegion(region: string): TreatmentTemplate[] {
  return getRegionalPriceProfile(region).templates;
}

function hashSeed(...parts: (string | number)[]) {
  let hash = 0;

  for (const part of parts) {
    const text = String(part);

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
  }

  return hash;
}

/** 결정적 시술가 (지역 템플릿 + 소폭 변동) */
export function priceForRegionalTreatment(
  region: string,
  seedParts: (string | number)[],
  jitterSteps = 4,
  jitterUnit = 5_000,
): number {
  const templates = getTreatmentTemplatesForRegion(region);
  const hash = hashSeed(...seedParts);
  const template = templates[hash % templates.length] ?? templates[0];
  const jitter = (hashSeed(...seedParts, 'price') % jitterSteps) * jitterUnit;

  return template.price + jitter;
}

export function weightedAveragePriceForRegion(region: string) {
  const templates = getTreatmentTemplatesForRegion(region);
  const totalWeight = templates.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = templates.reduce((sum, item) => sum + item.price * item.weight, 0);

  return Math.round(weightedSum / totalWeight);
}
