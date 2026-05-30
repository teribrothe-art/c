import { TREATMENT_TYPE_OPTIONS } from './treatment-options';

export type DiaryFilterKey = '전체' | '컷' | '컬러' | '펌' | '탈색' | '케어' | '매직' | '스파';

export type DiaryFilterOption = {
  key: DiaryFilterKey;
  label: string;
  icon: string;
};

/** 내 다이어리 상단 필터 — 디자이너 시술 종류와 동일 체계 */
export const DIARY_FILTER_OPTIONS: DiaryFilterOption[] = [
  { key: '전체', label: '전체', icon: '📋' },
  { key: '컷', label: '컷', icon: '✂️' },
  { key: '컬러', label: '컬러', icon: '🎨' },
  { key: '펌', label: '펌', icon: '💫' },
  { key: '탈색', label: '탈색', icon: '✨' },
  { key: '케어', label: '케어', icon: '💧' },
  { key: '매직', label: '매직', icon: '🪄' },
  { key: '스파', label: '스파', icon: '🧖' },
];

const normalizeType = (value: string) => value.trim().toLowerCase();

/** 시술 종류·시술명까지 참고해 필터 매칭 */
export function treatmentMatchesDiaryFilter(
  treatmentType: string,
  treatmentTitle: string,
  filter: DiaryFilterKey,
) {
  if (filter === '전체') {
    return true;
  }

  const type = normalizeType(treatmentType);
  const title = normalizeType(treatmentTitle);
  const combined = `${type} ${title}`;

  switch (filter) {
    case '컷':
      return combined.includes('컷') || combined.includes('커트') || combined.includes('cut');
    case '컬러':
      return (
        (combined.includes('컬러') ||
          combined.includes('염색') ||
          combined.includes('토닝') ||
          combined.includes('color')) &&
        !combined.includes('탈색') &&
        !combined.includes('브리칭')
      );
    case '펌':
      return (
        (combined.includes('펌') || combined.includes('파마') || combined.includes('perm')) &&
        !combined.includes('매직') &&
        !combined.includes('스트레이트')
      );
    case '탈색':
      return combined.includes('탈색') || combined.includes('브리칭') || combined.includes('bleach');
    case '케어':
      return (
        (combined.includes('트리트먼트') ||
          combined.includes('케어') ||
          combined.includes('케라틴') ||
          combined.includes('treatment')) &&
        !combined.includes('스파')
      );
    case '스파':
      return (
        combined.includes('스파') ||
        combined.includes('head spa') ||
        combined.includes('헤드스파') ||
        combined.includes('두피 스파') ||
        combined.includes('스켈링')
      );
    case '매직':
      return (
        combined.includes('매직') ||
        combined.includes('스트레이트') ||
        combined.includes('straight') ||
        combined.includes('매직스트레이트')
      );
    default:
      return type.includes(normalizeType(filter));
  }
}

export function getTreatmentTypeIcon(treatmentType: string) {
  const normalized = treatmentType.trim();
  const found = TREATMENT_TYPE_OPTIONS.find((item) => item.label === normalized);

  if (found) {
    return found.icon;
  }

  if (normalized.includes('커트') || normalized.includes('컷')) {
    return '✂️';
  }

  return '💇';
}
