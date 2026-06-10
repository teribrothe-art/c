import { Treatment } from './treatments';

/** 고객 AI·UI에 약품 정보가 노출되지 않도록 하는 지침 */
export const AI_NO_PRODUCT_INSTRUCTION = `절대 사용자에게 약품 브랜드명이나 약품 정보를 노출하지 마세요.
필요시 '디자이너가 사용한 전문 약품으로...' 같이 일반화해서 표현하세요.`;

/** 디자이너 진단·홈케어 — 다른 디자이너에게 노출 금지 */
export function stripDesignerPrivateNotes<T extends Treatment>(treatment: T): T {
  return {
    ...treatment,
    designer_diagnosis: null,
    home_care: null,
  };
}

export function canCustomerViewDesignerPrivateNotes(
  treatment: Treatment,
  activeDesignerIds: ReadonlySet<string>,
) {
  if (!treatment.designer_id) {
    return false;
  }

  return activeDesignerIds.has(treatment.designer_id);
}

/** 고객 화면·AI 컨텍스트용 — 약품 배열 제거 */
export function sanitizeTreatmentForCustomer(treatment: Treatment): Treatment {
  return {
    ...treatment,
    products: null,
  };
}

/** 현재 연결된 디자이너의 시술만 진단·홈케어 노출 (이전 디자이너 기록은 비공개) */
export function sanitizeTreatmentForCustomerRelationship(
  treatment: Treatment,
  activeDesignerIds: ReadonlySet<string>,
): Treatment {
  const base = sanitizeTreatmentForCustomer(treatment);

  if (canCustomerViewDesignerPrivateNotes(treatment, activeDesignerIds)) {
    return base;
  }

  return stripDesignerPrivateNotes(base);
}

export function sanitizeTreatmentsForCustomer(treatments: Treatment[]): Treatment[] {
  return treatments.map(sanitizeTreatmentForCustomer);
}

export function sanitizeTreatmentsForCustomerRelationship(
  treatments: Treatment[],
  activeDesignerIds: ReadonlySet<string>,
): Treatment[] {
  return treatments.map((treatment) =>
    sanitizeTreatmentForCustomerRelationship(treatment, activeDesignerIds),
  );
}

/** 디자이너 조회 — 본인 시술이 아니면 진단·홈케어·내부 메모 제거 */
export function sanitizeTreatmentForDesignerViewer(
  treatment: Treatment,
  viewerDesignerId: string,
): Treatment {
  if (treatment.designer_id === viewerDesignerId) {
    return treatment;
  }

  return {
    ...stripDesignerPrivateNotes(treatment),
    products: null,
    notes: null,
  };
}

export function sanitizeTreatmentsForDesignerViewer(
  treatments: Treatment[],
  viewerDesignerId: string,
): Treatment[] {
  return treatments.map((treatment) =>
    sanitizeTreatmentForDesignerViewer(treatment, viewerDesignerId),
  );
}
