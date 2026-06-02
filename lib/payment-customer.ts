import { getCurrentUser, isDemoAuthMode } from './auth';
import { isLocalPaymentSimulation } from './payment-config';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

/** 결제 시 고객 ID를 확정하고, 필요 시 시술에 고객을 연결합니다. */
export async function resolveTreatmentCustomerForPayment(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    throw new Error('고객 계정으로 로그인한 뒤 결제해주세요.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  if (!treatment.designer_id) {
    throw new Error('시술에 디자이너 정보가 없습니다.');
  }

  if (!treatment.customer_id) {
    const updated = await updateTreatment(treatmentId, {
      customer_id: user.id,
      customer_name: treatment.customer_name?.trim() || undefined,
    });

    return updated;
  }

  if (treatment.customer_id === user.id) {
    return treatment;
  }

  if (isDemoAuthMode || isLocalPaymentSimulation()) {
    const updated = await updateTreatment(treatmentId, {
      customer_id: user.id,
      customer_name: treatment.customer_name?.trim() || user.email,
    });

    return updated;
  }

  throw new Error('이 시술은 다른 고객 계정에 연결되어 있어요. 연결된 계정으로 로그인해주세요.');
}

export function getPaymentPartyIds(treatment: Treatment, payerCustomerId: string) {
  if (!treatment.designer_id) {
    throw new Error('시술에 디자이너 정보가 없습니다.');
  }

  return {
    customerId: payerCustomerId,
    designerId: treatment.designer_id,
  };
}
