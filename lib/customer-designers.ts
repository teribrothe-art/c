import { getTreatments, Treatment } from './treatments';

export type CustomerDesignerSummary = {
  key: string;
  designerId: string | null;
  designerName: string;
  treatmentCount: number;
  latestTreatmentDate: string;
  treatmentTypes: string[];
};

function designerKey(treatment: Treatment) {
  if (treatment.designer_id) {
    return `id:${treatment.designer_id}`;
  }

  const name = (treatment.designer_name ?? '').trim();
  return name ? `name:${name}` : 'unknown';
}

export function buildCustomerDesignerSummaries(treatments: Treatment[]) {
  const map = new Map<string, CustomerDesignerSummary>();

  for (const treatment of treatments) {
    const key = designerKey(treatment);
    const designerName = (treatment.designer_name ?? '').trim() || '디자이너';
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        designerId: treatment.designer_id ?? null,
        designerName,
        treatmentCount: 1,
        latestTreatmentDate: treatment.treatment_date,
        treatmentTypes: treatment.treatment_type ? [treatment.treatment_type] : [],
      });
      continue;
    }

    existing.treatmentCount += 1;

    if (treatment.treatment_date > existing.latestTreatmentDate) {
      existing.latestTreatmentDate = treatment.treatment_date;
    }

    if (
      treatment.treatment_type &&
      !existing.treatmentTypes.includes(treatment.treatment_type)
    ) {
      existing.treatmentTypes.push(treatment.treatment_type);
    }
  }

  return [...map.values()].sort((a, b) => b.latestTreatmentDate.localeCompare(a.latestTreatmentDate));
}

export async function getCustomerDesignerSummaries() {
  const { treatments } = await getTreatments();
  return buildCustomerDesignerSummaries(treatments);
}
