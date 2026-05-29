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

export function getDamageScoreColor(damageLevel: number) {
  if (damageLevel <= 3) {
    return '#00C2A8';
  }

  if (damageLevel <= 6) {
    return '#FFB627';
  }

  if (damageLevel <= 8) {
    return '#FF5A5F';
  }

  return '#C1121F';
}
