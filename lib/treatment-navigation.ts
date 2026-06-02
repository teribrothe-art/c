import type { Treatment } from './treatments';

function compareTreatmentChronology(a: Treatment, b: Treatment) {
  const dateCompare = b.treatment_date.localeCompare(a.treatment_date);

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return (b.created_at ?? '').localeCompare(a.created_at ?? '');
}

/** 최신 시술이 앞에 오도록 정렬 */
export function sortTreatmentsChronologically(treatments: Treatment[]) {
  return [...treatments].sort(compareTreatmentChronology);
}

/** 디자이너 화면: 같은 고객의 시술만 이전/다음 대상 */
export function filterTreatmentsForSameCustomer(
  treatments: Treatment[],
  current: Treatment,
) {
  const customerName = (current.customer_name ?? '').trim();

  return treatments.filter((item) => {
    if (current.customer_id && item.customer_id) {
      return item.customer_id === current.customer_id;
    }

    return (item.customer_name ?? '').trim() === customerName;
  });
}

export type TreatmentNavigationState = {
  total: number;
  index: number;
  /** 더 오래된 시술 (날짜상 이전) */
  olderId: string | null;
  /** 더 최근 시술 (날짜상 다음) */
  newerId: string | null;
};

/** 화면 표시용 — 1=가장 오래된 시술, N=최신 (이전/다음 버튼 방향과 맞춤) */
export function formatTreatmentPositionLabel(index: number, total: number) {
  const chronologicalIndex = total - index;
  return `${chronologicalIndex} / ${total}`;
}

export function getTreatmentNavigation(
  treatments: Treatment[],
  currentId: string,
): TreatmentNavigationState | null {
  const sorted = sortTreatmentsChronologically(treatments);
  const index = sorted.findIndex((item) => item.id === currentId);

  if (index < 0) {
    return null;
  }

  return {
    total: sorted.length,
    index,
    olderId: index < sorted.length - 1 ? sorted[index + 1].id : null,
    newerId: index > 0 ? sorted[index - 1].id : null,
  };
}
