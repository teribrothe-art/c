export type TreatmentInputTabKey = 'basic' | 'products' | 'technique' | 'care';

export const TREATMENT_INPUT_TABS: {
  key: TreatmentInputTabKey;
  label: string;
}[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'products', label: '사용약품' },
  { key: 'technique', label: '시술기법' },
  { key: 'care', label: '진단·케어' },
];

export function treatmentInputTabForField(
  field: string,
): TreatmentInputTabKey {
  if (field === 'products') {
    return 'products';
  }

  if (field === 'technique') {
    return 'technique';
  }

  if (field === 'designer_diagnosis' || field === 'home_care') {
    return 'care';
  }

  return 'basic';
}
