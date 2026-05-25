import { buildInsightPayload } from './insight-content';
import { Treatment } from './treatments';

export type DailyInsightType = string;

export type DailyCareSnapshot = {
  damageLevel: number | null;
  message: string;
  latestTreatmentId: string | null;
  insightType: DailyInsightType;
  recommendation: string | null;
  insightId?: string;
};

export type DailyCareContent = DailyCareSnapshot;

export function buildDailyCareContent(treatments: Treatment[]): DailyCareContent {
  const payload = buildInsightPayload(treatments);
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const firstLine = payload.insightMessage.split('\n')[0] ?? payload.insightMessage;

  return {
    damageLevel: payload.damageLevel,
    message: firstLine,
    latestTreatmentId: sorted[0]?.id ?? null,
    insightType: payload.insightType,
    recommendation: payload.recommendation,
  };
}

/** @deprecated use buildDailyCareContent */
export function buildDailyCareSnapshot(treatments: Treatment[]): DailyCareSnapshot {
  return buildDailyCareContent(treatments);
}
