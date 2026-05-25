import { buildInsightPayload } from './insight-content';
import type { DailyCareSnapshot } from './daily-insights';
import { Treatment } from './treatments';

export type { DailyCareSnapshot };
export type DailyCareContent = DailyCareSnapshot;

export function buildDailyCareContent(treatments: Treatment[]): DailyCareContent {
  const payload = buildInsightPayload(treatments);
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const firstLine = payload.message.split('\n')[0] ?? payload.message;

  return {
    damageLevel: payload.damageLevel,
    headline: payload.headline,
    message: firstLine,
    latestTreatmentId: sorted[0]?.id ?? null,
    recommendation: payload.recommendation,
  };
}

/** @deprecated use buildDailyCareContent */
export function buildDailyCareSnapshot(treatments: Treatment[]): DailyCareSnapshot {
  return buildDailyCareContent(treatments);
}
