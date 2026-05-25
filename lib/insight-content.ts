import { buildCustomerAnalysis } from './customer-analysis';
import { Treatment } from './treatments';

export type TimeOfDayGreeting = {
  label: string;
};

export type InsightPayload = {
  headline: string;
  message: string;
  damageLevel: number | null;
  recommendation: string | null;
};

export function getTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 6 && hour <= 11) {
    return '좋은 아침이에요';
  }

  if (hour >= 12 && hour <= 17) {
    return '오후도 화이팅';
  }

  if (hour >= 18 && hour <= 21) {
    return '오늘 하루 수고하셨어요';
  }

  return '편안한 밤 되세요';
}

export function getDamageHeadline(damageLevel: number | null | undefined): string {
  if (typeof damageLevel !== 'number') {
    return '시술 기록을 쌓아보세요';
  }

  if (damageLevel <= 3) {
    return '건강한 상태예요';
  }

  if (damageLevel <= 6) {
    return '보통 관리 필요';
  }

  if (damageLevel <= 8) {
    return '트리트먼트 추천';
  }

  return '집중 케어 필요!';
}

export function getDamageAccentColor(damageLevel: number | null | undefined) {
  if (typeof damageLevel !== 'number') {
    return '#7B5EE6' as const;
  }

  if (damageLevel <= 3) {
    return '#00C2A8' as const;
  }

  if (damageLevel <= 6) {
    return '#7B5EE6' as const;
  }

  return '#FF5A5F' as const;
}

function daysSinceTreatmentDate(treatmentDate: string, now = new Date()) {
  const treated = new Date(`${treatmentDate}T12:00:00`);
  const diffMs = now.getTime() - treated.getTime();

  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function buildWelcomeInsightLines(): string[] {
  return [
    '헤어 다이어리에 오신 것을 환영해요!',
    '첫 시술을 받으면 디자이너가 자동으로 기록해드려요',
    '그동안 다른 디자이너와 함께한 시술이 있다면 사진을 추가해보세요',
  ];
}

function buildTreatmentInsightLines(treatments: Treatment[], now = new Date()): string[] {
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const latest = sorted[0];
  const damageLevel = latest.damage_level ?? null;
  const elapsedDays = daysSinceTreatmentDate(latest.treatment_date, now);
  const analysis = buildCustomerAnalysis(treatments);
  const lines: string[] = [
    `최근 ${latest.treatment_title} 후 ${elapsedDays}일이 지났어요.`,
  ];

  if (typeof damageLevel === 'number') {
    if (damageLevel >= 7) {
      lines.push('산성 샴푸와 헤어 마스크를 주 2회 사용해보세요.');
    } else if (damageLevel >= 4) {
      lines.push('정기적인 트리트먼트로 모발 건강을 유지하세요.');
    } else {
      lines.push('현재 상태가 좋아요. 평소 관리 잘 하고 계세요.');
    }

    lines.push(`${damageLevel} 손상도를 고려하면 오늘은 자극을 줄이는 케어가 좋아요.`);
  } else {
    lines.push('시술 기록을 바탕으로 맞춤 케어를 이어가 보세요.');
  }

  if (analysis.hasData && analysis.nextRecommendation) {
    lines.push(`다음 시술 권장: ${analysis.nextRecommendation}`);
  }

  return lines.slice(0, 4);
}

export function buildInsightPayload(treatments: Treatment[], now = new Date()): InsightPayload {
  if (treatments.length === 0) {
    const lines = buildWelcomeInsightLines();

    return {
      headline: getDamageHeadline(null),
      message: lines.join('\n'),
      damageLevel: null,
      recommendation: null,
    };
  }

  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const latest = sorted[0];
  const damageLevel = latest.damage_level ?? null;
  const analysis = buildCustomerAnalysis(treatments);
  const lines = buildTreatmentInsightLines(treatments, now);

  return {
    headline: getDamageHeadline(damageLevel),
    message: lines.join('\n'),
    damageLevel,
    recommendation: analysis.hasData ? analysis.nextRecommendation : null,
  };
}

export function extractRecommendationFromMessage(message: string) {
  const line = message.split('\n').find((item) => item.startsWith('다음 시술 권장:'));

  if (!line) {
    return null;
  }

  return line.replace('다음 시술 권장:', '').trim();
}
