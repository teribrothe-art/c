import { Treatment } from './treatments';

type SearchOptions = {
  /** 디자이너 화면에서만 약품명 검색 허용 */
  includeProducts?: boolean;
};

export function filterTreatmentsByQuery(
  treatments: Treatment[],
  query: string,
  options: SearchOptions = {},
) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return treatments;
  }

  return treatments.filter((treatment) => {
    const parts = [
      treatment.treatment_title,
      treatment.treatment_type,
      treatment.designer_name ?? '',
      treatment.customer_name ?? '',
    ];

    if (options.includeProducts) {
      parts.push(...(treatment.products ?? []));
    }

    return parts.join(' ').toLowerCase().includes(normalized);
  });
}
