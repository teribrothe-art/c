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
