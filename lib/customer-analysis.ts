import { Treatment } from './treatments';

export type DamageTrendItem = {
  treatmentTitle: string;
  damageLevel: number;
  change: 'up' | 'down' | 'same' | null;
};

export type InsightItem = {
  date: string;
  title: string;
  insight: string;
};

export type CustomerAnalysis = {
  hasData: boolean;
  currentDamage: number | null;
  damageTrend: DamageTrendItem[];
  recentThreeMonthsCount: number;
  nextRecommendation: string;
  insights: InsightItem[];
};

function sortByDateDesc(treatments: Treatment[]) {
  return [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
}

function isWithinMonths(date: string, months: number) {
  const target = new Date(`${date}T00:00:00`);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return target >= cutoff;
}

function getNextRecommendation(latestDate?: string) {
  if (!latestDate) {
    return '6주 후';
  }

  const recommendedDate = new Date(`${latestDate}T00:00:00`);
  recommendedDate.setDate(recommendedDate.getDate() + 42);

  const weeksLeft = Math.ceil((recommendedDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000));

  if (weeksLeft <= 0) {
    return '지금이 좋은 시기예요';
  }

  return `${weeksLeft}주 후`;
}

export function buildCustomerAnalysis(treatments: Treatment[]): CustomerAnalysis {
  if (treatments.length === 0) {
    return {
      hasData: false,
      currentDamage: null,
      damageTrend: [],
      recentThreeMonthsCount: 0,
      nextRecommendation: '6주 후',
      insights: [],
    };
  }

  const sorted = sortByDateDesc(treatments);
  const recentThree = [...sorted.slice(0, 3)].reverse();
  const currentDamage = sorted[0].damage_level ?? null;

  const damageTrend: DamageTrendItem[] = recentThree.map((treatment, index) => {
    const damageLevel = treatment.damage_level ?? 0;
    const previous = index > 0 ? (recentThree[index - 1].damage_level ?? 0) : null;
    let change: DamageTrendItem['change'] = null;

    if (previous !== null) {
      if (damageLevel > previous) {
        change = 'up';
      } else if (damageLevel < previous) {
        change = 'down';
      } else {
        change = 'same';
      }
    }

    return {
      treatmentTitle: treatment.treatment_title,
      damageLevel,
      change,
    };
  });

  const recentThreeMonthsCount = treatments.filter((treatment) =>
    isWithinMonths(treatment.treatment_date, 3),
  ).length;

  const insights: InsightItem[] = sorted
    .filter((treatment) => Boolean(treatment.ai_insight?.trim()))
    .map((treatment) => ({
      date: treatment.treatment_date,
      title: treatment.treatment_title,
      insight: treatment.ai_insight!.trim(),
    }));

  return {
    hasData: true,
    currentDamage,
    damageTrend,
    recentThreeMonthsCount,
    nextRecommendation: getNextRecommendation(sorted[0]?.treatment_date),
    insights,
  };
}
