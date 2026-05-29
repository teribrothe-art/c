import { runAiCompletion } from './ai-completion';
import { isDesignerSettlementInputComplete } from './treatment-settlement';
import type { Treatment } from './treatments';
import { updateTreatment } from './treatments';

function treatmentTypeNextVisitHint(type: string) {
  const normalized = type.trim();

  if (normalized.includes('컷')) {
    return '6~8주';
  }

  if (normalized.includes('컬러') || normalized.includes('염색')) {
    return '4~6주';
  }

  if (normalized.includes('펌') || normalized.includes('매직')) {
    return '3~4개월';
  }

  if (normalized.includes('탈색')) {
    return '6개월';
  }

  if (normalized.includes('케어') || normalized.includes('트리트먼트')) {
    return '4주';
  }

  return '4~6주';
}

type RuleBasedInsightOptions = {
  regenerate?: boolean;
  /** 재생성 시 문구 순환용 (기본: 현재 시각 ms) */
  variantSeed?: number;
  /** 이전 인사이트와 겹치지 않도록 회피 */
  previousInsight?: string | null;
};

function buildRuleBasedInsightParts(treatment: Treatment) {
  const nextVisit = treatmentTypeNextVisitHint(treatment.treatment_type);
  const damage =
    typeof treatment.damage_level === 'number'
      ? `손상도 ${treatment.damage_level}/10을 고려하면 `
      : '';

  const home =
    treatment.home_care?.trim() ||
    treatment.designer_diagnosis?.trim().slice(0, 60) ||
    '평소 수분·열 보호 케어를 이어가세요.';

  return { nextVisit, damage, home };
}

const REGENERATE_INSIGHT_TEMPLATES = [
  (
    treatment: Treatment,
    nextVisit: string,
    damage: string,
    home: string,
  ) =>
    `${damage}최근 ${treatment.treatment_title}(${treatment.treatment_type}) 기준으로 다음 점검은 약 ${nextVisit} 후를 권장해요. ${home}`,
  (treatment: Treatment, nextVisit: string, damage: string, home: string) =>
    `${treatment.treatment_type} 시술 후에는 약 ${nextVisit} 뒤 재방문을 추천해요. ${damage}${home}`,
  (treatment: Treatment, nextVisit: string, damage: string, home: string) =>
    `${treatment.treatment_title} 이후 홈케어를 이어가며, 다음 관리는 ${nextVisit} 간격이 좋아요. ${damage}${home}`,
] as const;

export function buildRuleBasedTreatmentInsight(
  treatment: Treatment,
  options?: RuleBasedInsightOptions,
): string {
  const { nextVisit, damage, home } = buildRuleBasedInsightParts(treatment);

  if (!options?.regenerate) {
    return `${damage}${treatment.treatment_title} 후 다음 점검은 약 ${nextVisit} 뒤를 권장해요. ${home}`;
  }

  const seed = options.variantSeed ?? Date.now();
  const previous = options.previousInsight?.trim() ?? '';
  const startIndex = Math.abs(seed) % REGENERATE_INSIGHT_TEMPLATES.length;

  for (let offset = 0; offset < REGENERATE_INSIGHT_TEMPLATES.length; offset += 1) {
    const candidate = REGENERATE_INSIGHT_TEMPLATES[(startIndex + offset) % REGENERATE_INSIGHT_TEMPLATES.length](
      treatment,
      nextVisit,
      damage,
      home,
    );

    if (!previous || candidate.trim() !== previous) {
      return candidate;
    }
  }

  return REGENERATE_INSIGHT_TEMPLATES[startIndex](treatment, nextVisit, damage, home);
}

/** 인사이트 재생성에 필요한 최소 입력 (기법 없이 시술 종류만 있는 레거시·데모 포함) */
export function hasMinimumTreatmentAiInsightInput(treatment: Treatment | null | undefined) {
  if (!treatment) {
    return false;
  }

  return Boolean(
    treatment.designer_diagnosis?.trim() &&
      treatment.home_care?.trim() &&
      (treatment.technique?.trim() || treatment.treatment_type?.trim()),
  );
}

function buildTreatmentInsightContext(treatment: Treatment) {
  return {
    treatment_date: treatment.treatment_date,
    treatment_type: treatment.treatment_type,
    treatment_title: treatment.treatment_title,
    damage_level: treatment.damage_level ?? null,
    duration: treatment.duration ?? null,
    technique: treatment.technique ?? null,
    designer_diagnosis: treatment.designer_diagnosis ?? null,
    home_care: treatment.home_care ?? null,
  };
}

export function canGenerateTreatmentAiInsight(treatment: Treatment | null | undefined) {
  if (!treatment) {
    return false;
  }

  if (isDesignerSettlementInputComplete(treatment)) {
    return true;
  }

  // 기존 인사이트가 있는 시술은 기법 없이도 다시 생성 가능 (데모·이전 데이터)
  return Boolean(treatment.ai_insight?.trim() && hasMinimumTreatmentAiInsightInput(treatment));
}

/** 시술 입력 화면 — 이미 인사이트가 있을 때 「다시 생성」 버튼 활성 조건 */
export function canRegenerateTreatmentAiInsight(treatment: Treatment | null | undefined) {
  if (!treatment?.ai_insight?.trim()) {
    return false;
  }

  if (canGenerateTreatmentAiInsight(treatment)) {
    return true;
  }

  return Boolean(treatment.treatment_type?.trim() && treatment.treatment_title?.trim());
}

export function canUseTreatmentAiInsightAction(treatment: Treatment | null | undefined) {
  if (!treatment) {
    return false;
  }

  return treatment.ai_insight?.trim()
    ? canRegenerateTreatmentAiInsight(treatment)
    : canGenerateTreatmentAiInsight(treatment);
}

/** Claude 또는 규칙 기반으로 시술 AI 인사이트 문구 생성 */
export async function generateTreatmentAiInsightText(
  treatment: Treatment,
  options?: { regenerate?: boolean; variantSeed?: number },
): Promise<string> {
  const isRegenerate = options?.regenerate ?? Boolean(treatment.ai_insight?.trim());
  const allowed = isRegenerate
    ? canRegenerateTreatmentAiInsight(treatment)
    : canGenerateTreatmentAiInsight(treatment);

  if (!allowed) {
    throw new Error(
      isRegenerate
        ? '진단·홈케어를 입력한 뒤 AI 인사이트를 다시 생성할 수 있어요.'
        : '기법·진단·홈케어를 모두 입력한 뒤 AI 인사이트를 생성할 수 있어요.',
    );
  }

  const userMessage = isRegenerate
    ? '위 시술 데이터로 고객용 AI 인사이트를 이전과 다른 표현으로 2문장 다시 작성해주세요. 다음 방문 시기와 홈케어 핵심을 포함하세요.'
    : '위 시술 데이터로 고객용 AI 인사이트 2문장을 작성해주세요. 다음 방문 시기와 홈케어 핵심을 포함하세요.';

  try {
    const { text } = await runAiCompletion({
      task: 'treatment_insight',
      userMessage,
      context: buildTreatmentInsightContext(treatment),
    });

    const trimmed = text.replace(/^["'「]|["'」]$/g, '').trim();

    if (trimmed) {
      return trimmed;
    }
  } catch {
    // Claude 미연동·오류 시 규칙 기반 인사이트
  }

  const ruleBased = buildRuleBasedTreatmentInsight(treatment, {
    regenerate: isRegenerate,
    variantSeed: options?.variantSeed,
    previousInsight: isRegenerate ? treatment.ai_insight : null,
  });

  if (isRegenerate && ruleBased.trim() === treatment.ai_insight?.trim()) {
    return buildRuleBasedTreatmentInsight(treatment, {
      regenerate: true,
      variantSeed: (options?.variantSeed ?? Date.now()) + 1,
      previousInsight: treatment.ai_insight,
    });
  }

  return ruleBased;
}

export async function saveTreatmentAiInsight(treatmentId: string, insight: string) {
  const trimmed = insight.trim();

  if (!trimmed) {
    throw new Error('인사이트 내용이 비어 있습니다.');
  }

  return updateTreatment(treatmentId, { ai_insight: trimmed });
}

export async function generateAndSaveTreatmentAiInsight(
  treatment: Treatment,
  options?: { regenerate?: boolean; variantSeed?: number },
) {
  const isRegenerate = options?.regenerate ?? Boolean(treatment.ai_insight?.trim());
  const insight = await generateTreatmentAiInsightText(treatment, {
    ...options,
    regenerate: isRegenerate,
    variantSeed: options?.variantSeed ?? Date.now(),
  });
  const updated = await saveTreatmentAiInsight(treatment.id, insight);

  return { insight, treatment: updated };
}
