import {
  defaultTreatmentTitle,
  TREATMENT_TYPE_OPTIONS,
  titlePresetsForType,
} from './treatment-options';

export const TREATMENT_TYPE_SEPARATOR = ' · ';

export function parseTreatmentTypes(value: string | null | undefined) {
  if (!value?.trim()) {
    return [] as string[];
  }

  return value
    .split(TREATMENT_TYPE_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortTreatmentTypes(types: string[]) {
  const order = TREATMENT_TYPE_OPTIONS.map((item) => item.label);

  return [...types].sort(
    (a, b) =>
      (order.indexOf(a) >= 0 ? order.indexOf(a) : 99) -
      (order.indexOf(b) >= 0 ? order.indexOf(b) : 99),
  );
}

export function formatTreatmentTypes(types: readonly string[]) {
  const unique = sortTreatmentTypes([...new Set(types.map((item) => item.trim()).filter(Boolean))]);

  return unique.join(TREATMENT_TYPE_SEPARATOR);
}

export function toggleTreatmentType(selected: readonly string[], type: string) {
  const label = type.trim();

  if (!label) {
    return [...selected];
  }

  if (selected.includes(label)) {
    return selected.filter((item) => item !== label);
  }

  return sortTreatmentTypes([...selected, label]);
}

export function defaultTreatmentTitleFromTypes(types: readonly string[]) {
  if (types.length === 0) {
    return '시술';
  }

  if (types.length === 1) {
    return defaultTreatmentTitle(types[0]!);
  }

  return `${formatTreatmentTypes(types)} 시술`;
}

export function titlePresetsForTypes(types: readonly string[]) {
  const merged = new Set<string>();

  for (const type of types) {
    for (const preset of titlePresetsForType(type)) {
      merged.add(preset);
    }
  }

  return [...merged];
}

export function primaryTreatmentType(value: string | null | undefined) {
  return parseTreatmentTypes(value)[0] ?? value?.trim() ?? '';
}
