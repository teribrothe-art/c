import type { Href } from 'expo-router';

export type DesignerWelcomeSlide = {
  id: string;
  /** 배너에 크게 보이는 희망 키워드 */
  word: string;
  message: string;
  gradient: [string, string];
  href?: Href;
};

/** 디자이너 로그인 후 시작 화면 배너 */
export const DESIGNER_WELCOME_SLIDES: DesignerWelcomeSlide[] = [
  {
    id: 'welcome-growth',
    word: '성장',
    message: '오늘의 한 끗이 내일의 실력이 됩니다',
    gradient: ['#F0EBFF', '#E0D7FA'],
  },
  {
    id: 'welcome-trust',
    word: '신뢰',
    message: '기록이 쌓일수록 고객과의 연결도 깊어집니다',
    gradient: ['#E8FAF7', '#CCF2EC'],
  },
  {
    id: 'welcome-light',
    word: '빛',
    message: '당신의 손끝에서 누군가의 하루가 밝아집니다',
    gradient: ['#FFE8EA', '#FFD4D5'],
  },
  {
    id: 'welcome-passion',
    word: '열정',
    message: '사랑하는 일을 오래, 꾸준히 이어가세요',
    gradient: ['#FFF4E0', '#FFE0A8'],
  },
  {
    id: 'welcome-today',
    word: '오늘',
    message: '지금 이 순간도 충분히 잘하고 계세요',
    gradient: ['#EEF2FF', '#D9E4FF'],
  },
  {
    id: 'welcome-bloom',
    word: '꽃피움',
    message: '작은 시술 하나가 큰 변화의 시작입니다',
    gradient: ['#F5F0FF', '#EBE0FF'],
  },
];
