import { runAiCompletion } from './ai-completion';
import type { Treatment } from './treatments';
import { updateTreatment } from './treatments';

const DAMAGE_SOURCE_FIELDS = [
  'technique',
  'designer_diagnosis',
  'home_care',
  'products',
  'treatment_type',
  'treatment_title',
  'duration',
] as const;

export type DamageSourceField = (typeof DAMAGE_SOURCE_FIELDS)[number];

export function isDamageSourceField(field: string): field is DamageSourceField {
  return (DAMAGE_SOURCE_FIELDS as readonly string[]).includes(field);
}

export function parseDamageLevelFromAiText(text: string): number | null {
  const trimmed = text.trim();
  const direct = Number(trimmed);

  if (Number.isInteger(direct) && direct >= 1 && direct <= 10) {
    return direct;
  }

  const match = trimmed.match(/\b(10|[1-9])\s*\/\s*10\b/) ?? trimmed.match(/\b(10|[1-9])\b/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}

export function inferDamageLevelRuleBased(treatment: Treatment): number {
  const type = treatment.treatment_type?.trim() ?? '';
  const text = [
    treatment.treatment_title,
    treatment.technique,
    treatment.designer_diagnosis,
    treatment.home_care,
    treatment.products?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (type.includes('탈색') || text.includes('탈색') || text.includes('블리치')) {
    return 8;
  }

  if (
    type.includes('매직') ||
    type.includes('펌') ||
    text.includes('펌') ||
    text.includes('매직')
  ) {
    return 6;
  }

  if (type.includes('컬러') || type.includes('염색') || text.includes('염색')) {
    return 6;
  }

  if (type.includes('컷')) {
    return 4;
  }

  if (type.includes('케어') || type.includes('트리트먼트')) {
    return 4;
  }

  if (
    text.includes('손상') ||
    text.includes('건조') ||
    text.includes('깨짐') ||
    text.includes('약해') ||
    text.includes('끊김')
  ) {
    return 7;
  }

  if (text.includes('양호') || text.includes('건강') || text.includes('좋은 상태')) {
    return 4;
  }

  return 5;
}

function buildDamageLevelContext(treatment: Treatment) {
  return {
    treatment_date: treatment.treatment_date,
    treatment_type: treatment.treatment_type,
    treatment_title: treatment.treatment_title,
    duration: treatment.duration ?? null,
    technique: treatment.technique ?? null,
    designer_diagnosis: treatment.designer_diagnosis ?? null,
    home_care: treatment.home_care ?? null,
    products: treatment.products ?? null,
    current_damage_level: treatment.damage_level ?? null,
  };
}

export function canInferTreatmentDamageLevel(treatment: Treatment | null | undefined) {
  if (!treatment?.treatment_type?.trim() || !treatment.treatment_title?.trim()) {
    return false;
  }

  return Boolean(
    treatment.technique?.trim() ||
      treatment.designer_diagnosis?.trim() ||
      treatment.home_care?.trim(),
  );
}

/** Claude 또는 규칙 기반으로 손상도(1~10) 추정 */
export async function generateTreatmentDamageLevel(treatment: Treatment): Promise<number> {
  if (!canInferTreatmentDamageLevel(treatment)) {
    throw new Error('시술 종류·기법 또는 진단 내용을 입력한 뒤 손상도를 분석할 수 있어요.');
  }

  try {
    const { text } = await runAiCompletion({
      task: 'damage_level',
      userMessage:
        '위 시술 데이터만 보고 모발 손상도를 1~10 정수 하나로 평가하세요. 숫자만 출력하세요 (예: 7).',
      context: buildDamageLevelContext(treatment),
    });

    const parsed = parseDamageLevelFromAiText(text);

    if (parsed) {
      return parsed;
    }
  } catch {
    // AI 미연동·오류 시 규칙 기반
  }

  return inferDamageLevelRuleBased(treatment);
}

export async function saveTreatmentDamageLevel(treatmentId: string, damageLevel: number) {
  const clamped = Math.min(10, Math.max(1, Math.round(damageLevel)));

  return updateTreatment(treatmentId, { damage_level: clamped });
}

export async function generateAndSaveTreatmentDamageLevel(treatment: Treatment) {
  const damageLevel = await generateTreatmentDamageLevel(treatment);
  const updated = await saveTreatmentDamageLevel(treatment.id, damageLevel);

  return { damageLevel, treatment: updated };
}

/** 시술 내용 저장 후 손상도 자동 갱신 (이미 값이 있어도 내용 변경 시 재분석) */
export async function autoFillTreatmentDamageLevel(treatment: Treatment) {
  if (!canInferTreatmentDamageLevel(treatment)) {
    return treatment;
  }

  try {
    const { treatment: updated } = await generateAndSaveTreatmentDamageLevel(treatment);
    return updated;
  } catch {
    return treatment;
  }
}
