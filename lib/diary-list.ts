import type { DiaryFilterKey } from './diary-filters';
import { treatmentMatchesDiaryFilter } from './diary-filters';
import type { Treatment } from './treatments';

/** 내 다이어리 목록 — 최신 시술이 위로 */
export function sortTreatmentsForDiaryList(treatments: Treatment[]) {
  return [...treatments].sort((a, b) => {
    const dateCompare = b.treatment_date.localeCompare(a.treatment_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
}

/** 고객 본인에게 연결된 시술만 */
export function filterTreatmentsForCustomerUser(userId: string, treatments: Treatment[]) {
  return treatments.filter((item) => item.customer_id === userId);
}

export function countTreatmentsForDiaryFilter(
  treatments: Treatment[],
  filter: DiaryFilterKey,
) {
  return treatments.filter((treatment) =>
    treatmentMatchesDiaryFilter(
      treatment.treatment_type,
      treatment.treatment_title,
      filter,
    ),
  ).length;
}
