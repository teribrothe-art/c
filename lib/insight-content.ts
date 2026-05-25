import { buildTodayCarePayload } from './today-care-content';
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

export function buildInsightPayload(treatments: Treatment[], now = new Date()): InsightPayload {
  const payload = buildTodayCarePayload(treatments, now);

  return {
    ...payload,
    recommendation: null,
  };
}

export function extractRecommendationFromMessage(message: string) {
  const line = message.split('\n').find((item) => item.startsWith('다음 시술 권장:'));

  if (!line) {
    return null;
  }

  return line.replace('다음 시술 권장:', '').trim();
}
