import { buildCustomerAnalysis } from './customer-analysis';
import { Treatment } from './treatments';

export type DailyInsightType = 'high_damage' | 'mid_damage' | 'low_damage' | 'unknown_damage';

export type DailyCareSnapshot = {
  damageLevel: number | null;
  message: string;
  latestTreatmentId: string | null;
  insightType: DailyInsightType;
  recommendation: string | null;
  insightId?: string;
};

export type DailyCareContent = DailyCareSnapshot;

type DamageBand = 'low' | 'mid' | 'high' | 'unknown';

const DAILY_MESSAGES: Record<DamageBand, string[]> = {
  high: [
    '트리트먼트 하기 좋은 날',
    '딥 케어로 모발을 쉬게 해주세요',
    '열기구는 낮은 온도로, 짧게 사용해요',
    '단백질 트리트먼트가 특히 도움이 돼요',
    '샴푸는 산성 계열로 두피를 보호해요',
  ],
  mid: [
    '가벼운 홈케어로 컨디션을 유지해요',
    '수분 트리트먼트로 윤기를 채워보세요',
    '오늘은 열 차단제를 꼭 발라주세요',
    '빗질은 끝에서부터 부드럽게',
    '다음 시술 전까지 케어 루틴을 이어가요',
  ],
  low: [
    '컨디션이 좋아요, 가벼운 관리만으로 충분해요',
    '평소 샴푸 루틴을 유지해 보세요',
    '자외선·열 스트레스만 조심하면 돼요',
    '오늘은 스타일링에 집중해도 좋아요',
    '정기 점검 주기를 지키면 더 오래가요',
  ],
  unknown: [
    '오늘도 가벼운 홈케어로 관리해요',
    '시술 기록이 쌓이면 더 맞춤 조언을 드려요',
    '두피 마사지로 혈행을 살려보세요',
    '충분한 수면이 모발 회복에 도움이 돼요',
  ],
};

function getDamageBand(level: number | null | undefined): DamageBand {
  if (typeof level !== 'number') {
    return 'unknown';
  }

  if (level >= 7) {
    return 'high';
  }

  if (level >= 4) {
    return 'mid';
  }

  return 'low';
}

/** 같은 날짜에는 항상 같은 메시지 (기기·재실행 일관) */
export function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  return Math.floor(diff / dayMs);
}

function pickDailyMessage(band: DamageBand, date: Date, homeCare?: string | null) {
  const pool = DAILY_MESSAGES[band];
  const index = getDayOfYear(date) % pool.length;
  const base = pool[index];

  if (homeCare && getDayOfYear(date) % 3 === 0) {
    const snippet = homeCare.length > 36 ? `${homeCare.slice(0, 36)}…` : homeCare;
    return `${base}. ${snippet}`;
  }

  return base;
}

function bandToInsightType(band: DamageBand): DailyInsightType {
  if (band === 'high') {
    return 'high_damage';
  }

  if (band === 'mid') {
    return 'mid_damage';
  }

  if (band === 'low') {
    return 'low_damage';
  }

  return 'unknown_damage';
}

export function buildDailyCareContent(
  treatments: Treatment[],
  date = new Date(),
): DailyCareContent {
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const latest = sorted[0];
  const damageLevel = latest?.damage_level ?? null;
  const band = getDamageBand(damageLevel);
  const analysis = buildCustomerAnalysis(treatments);

  return {
    damageLevel,
    message: pickDailyMessage(band, date, latest?.home_care),
    latestTreatmentId: latest?.id ?? null,
    insightType: bandToInsightType(band),
    recommendation: analysis.hasData ? analysis.nextRecommendation : null,
  };
}

/** @deprecated use buildDailyCareContent */
export function buildDailyCareSnapshot(
  treatments: Treatment[],
  date = new Date(),
): DailyCareSnapshot {
  return buildDailyCareContent(treatments, date);
}
