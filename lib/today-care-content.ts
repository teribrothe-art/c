import { getDamageHeadline, getDamageScoreColor } from './damage-headline';
import { Treatment } from './treatments';

export { getDamageScoreColor } from './damage-headline';

export type TodayCarePayload = {
  damageLevel: number | null;
  headline: string;
  message: string;
};

function daysSinceTreatmentDate(treatmentDate: string, now = new Date()) {
  const treated = new Date(`${treatmentDate}T12:00:00`);
  const diffMs = now.getTime() - treated.getTime();

  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getDamageAdvice(damageLevel: number) {
  if (damageLevel <= 3) {
    return '현재 상태가 좋아요. 평소 관리 잘 하고 계세요.';
  }

  if (damageLevel <= 6) {
    return '정기적인 트리트먼트로 모발 건강을 유지하세요.';
  }

  if (damageLevel <= 8) {
    return '헤어 마스크를 주 2회 사용해보세요.';
  }

  return '디자이너 상담을 통한 집중 케어가 필요해요.';
}

/** 최근 시술 1건 기준 오늘의 케어 문구 */
export function buildTodayCarePayload(treatments: Treatment[], now = new Date()): TodayCarePayload {
  const sorted = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const latest = sorted[0];

  if (!latest) {
    return {
      damageLevel: null,
      headline: '헤어 다이어리에 오신 것을 환영해요',
      message: '첫 시술을 받으면\n자동으로 기록돼요.\n\n그동안의 시술 사진도\n추가할 수 있어요.',
    };
  }

  const damageLevel = latest.damage_level ?? null;
  const elapsedDays = daysSinceTreatmentDate(latest.treatment_date, now);

  if (typeof damageLevel !== 'number') {
    return {
      damageLevel: null,
      headline: getDamageHeadline(null),
      message: `최근 ${latest.treatment_title} 후 ${elapsedDays}일이 지났어요.\n\n시술 기록을 바탕으로 케어를 이어가 보세요.`,
    };
  }

  const advice = getDamageAdvice(damageLevel);

  return {
    damageLevel,
    headline: getDamageHeadline(damageLevel),
    message: `최근 ${latest.treatment_title} 후 ${elapsedDays}일이 지났어요.\n\n${advice}`,
  };
}
