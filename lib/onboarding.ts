import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserRole } from './auth';

const KEY_PREFIX = 'hair-diary-onboarding-seen';

function storageKey(role: UserRole) {
  return `${KEY_PREFIX}-${role}`;
}

export type OnboardingSlide = {
  title: string;
  description: string;
  icon: string;
};

export const CUSTOMER_ONBOARDING_SLIDES: OnboardingSlide[] = [
  { icon: '📔', title: '내 헤어 평생 기록', description: '모든 시술을 한곳에 모아 손쉽게 관리해요.' },
  { icon: '✂️', title: '전문 디자이너 진단', description: '디자이너의 진단과 홈케어 가이드를 받아보세요.' },
  { icon: '💬', title: 'AI 맞춤 조언', description: '시술 이력 기반 AI가 케어 방법을 알려드려요.' },
];

export const DESIGNER_ONBOARDING_SLIDES: OnboardingSlide[] = [
  { icon: '💎', title: '내 시술 이력은 평생 자산', description: '고객별 시술 기록을 체계적으로 쌓아가세요.' },
  { icon: '🔒', title: '디자이너 영업비밀 보호', description: '약품 정보는 디자이너만 볼 수 있어요.' },
  { icon: '💰', title: '수수료 4%부터, 정산 자동', description: '결제·정산 흐름을 앱에서 한 번에 관리해요.' },
];

export async function hasSeenOnboarding(role: UserRole) {
  const value = await AsyncStorage.getItem(storageKey(role));
  return value === 'true';
}

export async function markOnboardingSeen(role: UserRole) {
  await AsyncStorage.setItem(storageKey(role), 'true');
}

export async function shouldShowOnboarding(role: UserRole | null | undefined) {
  if (!role) {
    return false;
  }

  return !(await hasSeenOnboarding(role));
}
