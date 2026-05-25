import type { Href } from 'expo-router';

import type { Treatment } from './treatments';

export type HomePromoSlide = {
  id: string;
  kind: 'product' | 'designer' | 'tip' | 'ai';
  title: string;
  subtitle: string;
  ctaLabel: string;
  badge?: string;
  gradient: [string, string];
  href?: Href;
};

function uniqueDesigners(treatments: Treatment[]) {
  const map = new Map<string, { name: string; specialty: string }>();

  for (const treatment of treatments) {
    const name = treatment.designer_name?.trim();

    if (!name || map.has(name)) {
      continue;
    }

    map.set(name, {
      name,
      specialty: treatment.treatment_type,
    });
  }

  return [...map.values()].slice(0, 4);
}

/** 다이어리 홈 하단 프로모션 슬라이드 */
export function buildHomePromoSlides(treatments: Treatment[]): HomePromoSlide[] {
  const designers = uniqueDesigners(treatments);

  const slides: HomePromoSlide[] = [
    {
      id: 'promo-product-1',
      kind: 'product',
      badge: '추천 케어',
      title: '수분·열 보호 케어 라인',
      subtitle: '건조·자외선에 지친 모발을 위한 홈케어 제품을 만나보세요',
      ctaLabel: '케어 팁 보기',
      gradient: ['#FFE8EA', '#FFD4D5'],
      href: '/analysis',
    },
    {
      id: 'promo-product-2',
      kind: 'product',
      badge: '시즌 특집',
      title: '컬러 유지 앰플 & 마스크',
      subtitle: '염색·탈색 고객을 위한 컬러 케어 루틴을 확인하세요',
      ctaLabel: '분석 화면으로',
      gradient: ['#E8FAF7', '#CCF2EC'],
      href: '/analysis',
    },
  ];

  for (const [index, designer] of designers.entries()) {
    slides.push({
      id: `promo-designer-${index}`,
      kind: 'designer',
      badge: '우수 디자이너',
      title: designer.name,
      subtitle: `${designer.specialty} 전문 · 내 시술 기록과 연결된 디자이너`,
      ctaLabel: '시술 기록 보기',
      gradient: ['#F0EBFF', '#E0D7FA'],
      href: '/home',
    });
  }

  slides.push(
    {
      id: 'promo-ai',
      kind: 'ai',
      badge: 'AI 상담',
      title: '오늘 모발 고민, AI와 상담',
      subtitle: '시술 이력·날씨·케어 기록을 바탕으로 맞춤 답변을 받아보세요',
      ctaLabel: 'AI 상담 시작',
      gradient: ['#FFF4E0', '#FFE0A8'],
      href: '/voice',
    },
    {
      id: 'promo-diary',
      kind: 'tip',
      badge: '다이어리',
      title: '연도별 시술 기록 한눈에',
      subtitle: '여러 번 받은 시술도 연도·필터별로 정리해 관리하세요',
      ctaLabel: '연도별 보기',
      gradient: ['#EEF2FF', '#D9E4FF'],
      href: '/diary',
    },
  );

  return slides;
}
