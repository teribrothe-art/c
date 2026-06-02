import type { BetaTestAccount } from './beta-test-accounts';
import type { Treatment } from './treatments';

const DEMO_CUSTOMER_PASSWORD = 'demo1234';

/** 노원구 거주 · 2년 시술 이력 남성 테스트 고객 */
export const SEO_JUNGHYUN_TEST_ACCOUNT: BetaTestAccount = {
  id: 'demo-customer-seo-junghyun',
  email: 'seo-junghyun@hair.app',
  name: '서정현',
  password: DEMO_CUSTOMER_PASSWORD,
  role: 'customer',
};

export const SEO_JUNGHYUN_CUSTOMER_META = '서울 노원구 · 남 · 2년 시술 이력';

const DESIGNER_ID = 'demo-designer-local';
const DESIGNER_NAME = '김미용 디자이너';
const CUSTOMER_ID = SEO_JUNGHYUN_TEST_ACCOUNT.id;
const CUSTOMER_NAME = SEO_JUNGHYUN_TEST_ACCOUNT.name ?? '서정현';

/** 남성 헤어 시술 전·후 (Unsplash) */
const SEO_TREATMENT_PHOTOS = {
  cutLatest: {
    before:
      'https://images.unsplash.com/photo-1507003211169-0bce1a00101?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1506794778202-c847ac76533?auto=format&fit=crop&w=900&q=80',
  },
  shadowPerm: {
    before:
      'https://images.unsplash.com/photo-1492106087820-71f1a00d2d11?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80',
  },
  downPerm: {
    before:
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80',
  },
  blackDye: {
    before:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  },
  cutCrop: {
    before:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=900&q=80',
  },
  treatment: {
    before:
      'https://images.unsplash.com/photo-1521590839637-31813ae3d58c?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1622286342622-9d0b8917b064?auto=format&fit=crop&w=900&q=80',
  },
  firstVisit: {
    before:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=900&q=80',
    after:
      'https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&w=900&q=80',
  },
} as const;

function completedTreatment(
  partial: Omit<Treatment, 'customer_id' | 'designer_id' | 'designer_name' | 'customer_name'>,
): Treatment {
  const fees = Math.round((partial.price ?? 0) * 0.1);

  return {
    customer_id: CUSTOMER_ID,
    designer_id: DESIGNER_ID,
    designer_name: DESIGNER_NAME,
    customer_name: CUSTOMER_NAME,
    feedback_completed: true,
    payment_status: 'completed',
    paid_at: `${partial.treatment_date}T14:00:00.000Z`,
    settled_at: `${partial.treatment_date}T15:00:00.000Z`,
    platform_fee: fees,
    designer_payout_amount: (partial.price ?? 0) - fees,
    notes: '거주: 서울 노원구',
    ...partial,
  };
}

/** 기준일 2026-05-27 — 2년간 단골 남성 고객 시술 타임라인 */
export const SEO_JUNGHYUN_DEMO_TREATMENTS: Treatment[] = [
  completedTreatment({
    id: 'demo-treatment-seo-1',
    treatment_date: '2026-04-27',
    treatment_type: '컷',
    treatment_title: '남성 가일 컷',
    products: ['로레알 프로페셔널'],
    damage_level: 3,
    duration: '40분',
    designer_diagnosis: '1달 전 컷. 노원구 거주 남성 고객, 뿌리 볼륨과 앞머리 라인 정리.',
    home_care: '왁스 소량으로 결 정돈. 4~6주 후 트리밍 권장.',
    ai_insight: '쉐도우펌 유지를 위해 건조한 두피 보습과 열기구 온도 낮게.',
    price: 35000,
    before_photo_url: SEO_TREATMENT_PHOTOS.cutLatest.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.cutLatest.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-2',
    treatment_date: '2026-02-25',
    treatment_type: '펌',
    treatment_title: '쉐도우펌',
    products: ['아모스 쉐도우펌제', '中간산화'],
    damage_level: 4,
    duration: '2시간',
    designer_diagnosis: '3달 전 쉐도우펌. 자연스러운 S컬과 은은한 볼륨, 남성스러운 텍스처.',
    home_care: '시술 후 48시간 샴푸 금지. 컬 크림으로 결 유지.',
    ai_insight: '펌 유지 3~4개월. 다운펌과 병행 시 스타일 변화 폭 조절.',
    price: 120000,
    before_photo_url: SEO_TREATMENT_PHOTOS.shadowPerm.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.shadowPerm.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-3',
    treatment_date: '2025-11-28',
    treatment_type: '펌',
    treatment_title: '다운펌',
    products: ['다운펌 전용약', '트리트먼트'],
    damage_level: 4,
    duration: '1시간 30분',
    designer_diagnosis: '6개월 전 다운펌. 뿌리 볼륨 다운으로 깔끔한 남성 실루엣.',
    home_care: '뿌리 기름기 관리. 가벼운 스타일링 폼 사용.',
    ai_insight: '볼륨 다운 후 4개월, 쉐도우펌으로 재스타일링.',
    price: 80000,
    before_photo_url: SEO_TREATMENT_PHOTOS.downPerm.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.downPerm.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-4',
    treatment_date: '2025-05-24',
    treatment_type: '컬러',
    treatment_title: '검정 자연 염색',
    products: ['검정 2N', '산화제 6%'],
    damage_level: 5,
    duration: '1시간 40분',
    designer_diagnosis: '1년 전 검정 염색. 새치 커버 및 톤 균일, 남성 고객 자연스러운 검정.',
    home_care: '컬러 샴푸 사용. UV·열 보호.',
    ai_insight: '염색 8~10주 후 뿌리 리터치 또는 다운펌 검토.',
    price: 70000,
    before_photo_url: SEO_TREATMENT_PHOTOS.blackDye.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.blackDye.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-5',
    treatment_date: '2024-11-18',
    treatment_type: '컷',
    treatment_title: '남성 크롭 컷',
    products: ['두피 토닉'],
    damage_level: 3,
    duration: '35분',
    designer_diagnosis: '1년 6개월 전 컷. 겨울철 건조 두피, 가벼운 크롭 스타일.',
    home_care: '두피 보습 토너. 빗질로 혈액순환.',
    ai_insight: '정기 컷 주기 6주. 염색 전 컷트로 길이 정리.',
    price: 30000,
    before_photo_url: SEO_TREATMENT_PHOTOS.cutCrop.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.cutCrop.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-6',
    treatment_date: '2024-07-15',
    treatment_type: '트리트먼트',
    treatment_title: '두피·모발 케어',
    products: ['두피 스케일링', '단백질 팩'],
    damage_level: 3,
    duration: '50분',
    designer_diagnosis: '여름철 두피 각질·유분 밸런스 케어. 남성 고객 두피 타입 맞춤.',
    home_care: '주 1회 두피 마사지. 과도한 왁스 사용 자제.',
    ai_insight: '두피 상태 양호. 가을 컷 전 트리트먼트 유지.',
    price: 45000,
    before_photo_url: SEO_TREATMENT_PHOTOS.treatment.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.treatment.after,
  }),
  completedTreatment({
    id: 'demo-treatment-seo-7',
    treatment_date: '2024-05-20',
    treatment_type: '컷',
    treatment_title: '첫 방문 · 베이직 컷',
    products: ['베이직 샴푸'],
    damage_level: 2,
    duration: '30분',
    designer_diagnosis: '2년 전 첫 방문. 노원구 거주 서정현 고객, 깔끔한 남성 베이직 스타일 상담.',
    home_care: '매일 샴푸·드라이 기본 루틴. 6주 후 재방문 권장.',
    ai_insight: '단골 등록. 정기 컷·펌·염색 이력 2년 누적.',
    price: 28000,
    before_photo_url: SEO_TREATMENT_PHOTOS.firstVisit.before,
    after_photo_url: SEO_TREATMENT_PHOTOS.firstVisit.after,
  }),
];
