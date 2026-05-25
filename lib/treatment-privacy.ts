import { Treatment } from './treatments';

/** 고객 AI·UI에 약품 정보가 노출되지 않도록 하는 지침 */
export const AI_NO_PRODUCT_INSTRUCTION = `절대 사용자에게 약품 브랜드명이나 약품 정보를 노출하지 마세요.
필요시 '디자이너가 사용한 전문 약품으로...' 같이 일반화해서 표현하세요.`;

/** 고객 화면·AI 컨텍스트용 — 약품 배열 제거 */
export function sanitizeTreatmentForCustomer(treatment: Treatment): Treatment {
  return {
    ...treatment,
    products: null,
  };
}

export function sanitizeTreatmentsForCustomer(treatments: Treatment[]): Treatment[] {
  return treatments.map(sanitizeTreatmentForCustomer);
}
