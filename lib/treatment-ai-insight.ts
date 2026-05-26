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

export function buildRuleBasedTreatmentInsight(
  treatment: Treatment,
  options?: { regenerate?: boolean },
): string {
  const nextVisit = treatmentTypeNextVisitHint(treatment.treatment_type);
  const damage =
    typeof treatment.damage_level === 'number'
      ? `손상도 ${treatment.damage_level}/10을 고려하면 `
      : '';

  const home =
    treatment.home_care?.trim() ||
    treatment.designer_diagnosis?.trim().slice(0, 60) ||
    '평소 수분·열 보호 케어를 이어가세요.';

  if (options?.regenerate) {
    return `${damage}최근 ${treatment.treatment_title}(${treatment.treatment_type}) 기준으로 다음 점검은 약 ${nextVisit} 후를 권장해요. ${home}`;
  }

  return `${damage}${treatment.treatment_title} 후 다음 점검은 약 ${nextVisit} 뒤를 권장해요. ${home}`;
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

/** Claude 또는 규칙 기반으로 시술 AI 인사이트 문구 생성 */
export async function generateTreatmentAiInsightText(
  treatment: Treatment,
  options?: { regenerate?: boolean },
): Promise<string> {
  const isRegenerate = options?.regenerate ?? Boolean(treatment.ai_insight?.trim());

  if (!canGenerateTreatmentAiInsight(treatment)) {
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

  return buildRuleBasedTreatmentInsight(treatment, { regenerate: isRegenerate });
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
  options?: { regenerate?: boolean },
) {
  const insight = await generateTreatmentAiInsightText(treatment, options);
  const updated = await saveTreatmentAiInsight(treatment.id, insight);

  return { insight, treatment: updated };
}
