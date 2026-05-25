import { runAiCompletion } from './ai-completion';
import { isAiAppUtilizationEnabled } from './ai-edge';
import type { TodayCarePayload } from './today-care-content';
import { sanitizeTreatmentsForCustomer } from './treatment-privacy';
import { Treatment } from './treatments';

function buildDailyCareContext(treatments: Treatment[], base: TodayCarePayload) {
  const sorted = [...treatments]
    .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))
    .slice(0, 5);

  return {
    baseline_headline: base.headline,
    baseline_message: base.message,
    damage_level: base.damageLevel,
    recent_treatments: sanitizeTreatmentsForCustomer(sorted).map((item) => ({
      date: item.treatment_date,
      type: item.treatment_type,
      title: item.treatment_title,
      damage_level: item.damage_level ?? null,
      diagnosis: item.designer_diagnosis ?? null,
      home_care: item.home_care ?? null,
      ai_insight: item.ai_insight ?? null,
    })),
  };
}

/** Claude 연동 시 오늘의 케어 문구를 AI로 보강 (실패 시 baseline 유지) */
export async function enhanceTodayCareWithAi(
  treatments: Treatment[],
  base: TodayCarePayload,
): Promise<TodayCarePayload> {
  if (!isAiAppUtilizationEnabled() || treatments.length === 0) {
    return base;
  }

  try {
    const { text } = await runAiCompletion({
      task: 'daily_care',
      userMessage:
        '위 데이터를 바탕으로 오늘의 케어 메시지를 작성해주세요. 마지막 줄은 "다음 시술 권장:" 형식이어야 합니다.',
      context: buildDailyCareContext(treatments, base),
    });

    const trimmed = text.trim();

    if (!trimmed) {
      return base;
    }

    return {
      ...base,
      message: trimmed,
    };
  } catch {
    return base;
  }
}
