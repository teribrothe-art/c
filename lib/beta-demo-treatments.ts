import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import type { Treatment } from './treatments';

const BETA_TREATMENT_TEMPLATES = [
  { type: '컷', title: '레이어드 컷', price: 120000 },
  { type: '컬러', title: '애쉬브라운 컬러', price: 180000 },
  { type: '펌', title: '볼륨 디지털 펌', price: 220000 },
  { type: '트리트먼트', title: '단백질 딥 케어', price: 90000 },
  { type: '매직', title: '매직스트레이트', price: 280000 },
] as const;

/** 베타 디자이너 1:1 연동 고객 시술 — 테스트 로그인 고객수와 고객 탭 일치 */
export const BETA_DEMO_TREATMENTS: Treatment[] = BETA_DESIGNERS.map((designer, index) => {
  const customer = BETA_CUSTOMERS[index];
  const template = BETA_TREATMENT_TEMPLATES[index] ?? BETA_TREATMENT_TEMPLATES[0];
  const slot = index + 1;
  const treatmentDate = `2026-05-${String(10 + slot).padStart(2, '0')}`;

  return {
    id: `beta-treatment-${String(slot).padStart(2, '0')}`,
    customer_id: customer.id,
    designer_id: designer.id,
    designer_name: designer.name,
    customer_name: customer.name,
    treatment_date: treatmentDate,
    treatment_type: template.type,
    treatment_title: template.title,
    products: ['로레알'],
    damage_level: 4,
    duration: '1시간 30분',
    designer_diagnosis: `${customer.name} 베타 테스트 연동 고객`,
    home_care: '정기 케어 권장',
    ai_insight: '베타 테스트 시술 기록',
    price: template.price,
    payment_status: 'completed',
    paid_at: `${treatmentDate}T12:00:00.000Z`,
    settled_at: `${treatmentDate}T14:00:00.000Z`,
    platform_fee: Math.round(template.price * 0.04),
    designer_payout_amount: Math.round(template.price * 0.96),
    feedback_completed: true,
  };
});
