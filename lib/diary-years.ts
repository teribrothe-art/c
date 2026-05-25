import type { Treatment } from './treatments';

export type DiaryYearSummary = {
  year: number;
  count: number;
};

export function getTreatmentYear(treatment: Treatment) {
  const year = Number.parseInt(treatment.treatment_date.slice(0, 4), 10);

  if (Number.isFinite(year)) {
    return year;
  }

  return new Date().getFullYear();
}

/** 지난 연도부터 보이도록 오름차순(과거 → 최근) */
export function getDiaryYearSummaries(treatments: Treatment[]): DiaryYearSummary[] {
  const counts = new Map<number, number>();

  for (const treatment of treatments) {
    const year = getTreatmentYear(treatment);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

export function filterTreatmentsByYear(treatments: Treatment[], year: number) {
  return treatments.filter((item) => getTreatmentYear(item) === year);
}

export function sortTreatmentsInYear(treatments: Treatment[]) {
  return [...treatments].sort((a, b) => {
    const dateCompare = b.treatment_date.localeCompare(a.treatment_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
}
